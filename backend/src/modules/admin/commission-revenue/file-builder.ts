// Lightweight CSV / XLSX builders used by the Export service.
// No external spreadsheet dependency is required; the XLSX output is a
// valid minimal OOXML workbook packaged in an uncompressed (STORE) ZIP.

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function csvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(
  header: string[],
  rows: (string | number)[][],
): Buffer {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(','));
  // UTF-8 BOM so Excel opens multi-byte text correctly.
  return Buffer.from('\uFEFF' + lines.join('\r\n'), 'utf8');
}

// ---------------------------------------------------------------------------
// Minimal XLSX builder
// ---------------------------------------------------------------------------

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeLocalFileHeader(name: string, content: Buffer): Buffer {
  const nameBuf = Buffer.from(name, 'utf8');
  const crc = crc32(content);

  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0); // local file header signature
  header.writeUInt16LE(20, 4); // version needed
  header.writeUInt16LE(0x0800, 6); // flags: UTF-8 names
  header.writeUInt16LE(0, 8); // method: stored
  header.writeUInt16LE(0, 10); // mod time
  header.writeUInt16LE(0, 12); // mod date
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(content.length, 18); // compressed size
  header.writeUInt32LE(content.length, 22); // uncompressed size
  header.writeUInt16LE(nameBuf.length, 26);
  header.writeUInt16LE(0, 28); // extra length

  return Buffer.concat([header, nameBuf, content]);
}

function makeCentralDir(name: string, content: Buffer, offset: number): Buffer {
  const nameBuf = Buffer.from(name, 'utf8');
  const crc = crc32(content);

  const rec = Buffer.alloc(46);
  rec.writeUInt32LE(0x02014b50, 0); // central directory signature
  rec.writeUInt16LE(20, 4); // version made by
  rec.writeUInt16LE(20, 6); // version needed
  rec.writeUInt16LE(0x0800, 8); // flags
  rec.writeUInt16LE(0, 10); // method
  rec.writeUInt16LE(0, 12); // time
  rec.writeUInt16LE(0, 14); // date
  rec.writeUInt32LE(crc, 16);
  rec.writeUInt32LE(content.length, 20);
  rec.writeUInt32LE(content.length, 24);
  rec.writeUInt16LE(nameBuf.length, 28);
  rec.writeUInt16LE(0, 30); // extra
  rec.writeUInt16LE(0, 32); // comment
  rec.writeUInt16LE(0, 34); // disk start
  rec.writeUInt16LE(0, 36); // internal attrs
  rec.writeUInt32LE(0, 38); // external attrs
  rec.writeUInt32LE(offset, 42); // local header offset

  return Buffer.concat([rec, nameBuf]);
}

function buildZip(files: { name: string; content: Buffer }[]): Buffer {
  let offset = 0;
  const localParts: Buffer[] = [];
  for (const f of files) {
    const local = makeLocalFileHeader(f.name, f.content);
    localParts.push(local);
    offset += local.length;
  }

  let centralOffset = offset;
  const centralParts: Buffer[] = [];
  for (const f of files) {
    centralParts.push(makeCentralDir(f.name, f.content, centralOffset));
    centralOffset += f.content.length + 30 + Buffer.byteLength(f.name);
  }

  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory
  end.writeUInt16LE(0, 4); // disk number
  end.writeUInt16LE(0, 6); // disk with central dir
  end.writeUInt16LE(files.length, 8); // entries on disk
  end.writeUInt16LE(files.length, 10); // total entries
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localParts, central, end]);
}

function columnName(index: number): string {
  let n = index;
  let s = '';
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

export function buildXlsx(
  header: string[],
  rows: (string | number)[][],
): Buffer {
  const escapedValues = [...header, ...rows.flat()].map((v) =>
    xmlEscape(String(v)),
  );
  const deduped = Array.from(new Set(escapedValues));

  const sharedStringXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${escapedValues.length}" uniqueCount="${deduped.length}">` +
    deduped.map((s) => `<si><t>${s}</t></si>`).join('') +
    '</sst>';

  const stringIndex = (value: string | number): number =>
    deduped.indexOf(xmlEscape(String(value)));

  const allCells = [header, ...rows].map((row) => row.slice());
  const rowXml = allCells
    .map((r, rIdx) => {
      const cells = r
        .map((c, cIdx) => {
          const ref = `${columnName(cIdx)}${rIdx + 1}`;
          const idx = stringIndex(c);
          const isNumber = !isNaN(Number(c));
          const style = rIdx === 0 ? ' s="3"' : isNumber ? ' s="2"' : '';
          return `<c r="${ref}" t="s"${style}><v>${idx}</v></c>`;
        })
        .join('');
      return `<row r="${rIdx + 1}">${cells}</row>`;
    })
    .join('');

  const sheetXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<dimension ref="A1"/>' +
    '<sheetData>' +
    rowXml +
    '</sheetData>' +
    '</worksheet>';

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>';

  const rootRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets>' +
    '</workbook>';

  const workbookRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>';

  const styles =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="none"><fgColor rgb="FF22C55E"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF22C55E"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0"><alignment horizontal="right"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0"/><xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0"><alignment horizontal="center"/></xf></cellXfs>' +
    '</styleSheet>';

  const files: { name: string; content: Buffer }[] = [
    { name: '[Content_Types].xml', content: Buffer.from(contentTypes, 'utf8') },
    { name: '_rels/.rels', content: Buffer.from(rootRels, 'utf8') },
    { name: 'xl/workbook.xml', content: Buffer.from(workbook, 'utf8') },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: Buffer.from(workbookRels, 'utf8'),
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content: Buffer.from(sheetXml, 'utf8'),
    },
    {
      name: 'xl/sharedStrings.xml',
      content: Buffer.from(sharedStringXml, 'utf8'),
    },
    { name: 'xl/styles.xml', content: Buffer.from(styles, 'utf8') },
  ];

  return buildZip(files);
}
