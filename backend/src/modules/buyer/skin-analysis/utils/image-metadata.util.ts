export type ImageFormat = 'jpeg' | 'png' | 'webp';

export interface ImageMetadata {
  format: ImageFormat;
  contentType: string;
  width: number;
  height: number;
}

/**
 * Validates image magic bytes and extracts pixel dimensions without relying
 * on native imaging libraries. Supported formats: JPEG, PNG, WebP.
 */
export function readImageMetadata(buffer: Buffer): ImageMetadata | null {
  if (!buffer || buffer.length < 24) return null;

  if (isJpeg(buffer)) {
    const size = readJpegDimensions(buffer);
    if (!size) return null;
    return {
      format: 'jpeg',
      contentType: 'image/jpeg',
      width: size.width,
      height: size.height,
    };
  }

  if (isPng(buffer)) {
    const size = readPngDimensions(buffer);
    if (!size) return null;
    return {
      format: 'png',
      contentType: 'image/png',
      width: size.width,
      height: size.height,
    };
  }

  if (isWebp(buffer)) {
    const size = readWebpDimensions(buffer);
    if (!size) return null;
    return {
      format: 'webp',
      contentType: 'image/webp',
      width: size.width,
      height: size.height,
    };
  }

  return null;
}

function isJpeg(buffer: Buffer): boolean {
  return (
    buffer.length > 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  );
}

function isPng(buffer: Buffer): boolean {
  const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buffer.length < 24) return false;
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (buffer[i] !== PNG_SIGNATURE[i]) return false;
  }
  // IHDR chunk right after signature: length(4) + "IHDR"(4)
  return (
    buffer[12] === 0x49 &&
    buffer[13] === 0x48 &&
    buffer[14] === 0x44 &&
    buffer[15] === 0x52
  );
}

function isWebp(buffer: Buffer): boolean {
  // "RIFF" (4) + size (4) + "WEBP" (4)
  if (buffer.length < 30) return false;
  return (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  );
}

function readPngDimensions(buffer: Buffer): { width: number; height: number } {
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function readJpegDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  // Walk APP markers until SOF0..SOF3 / SOF5..SOF7 / SOF9..SOF11 / SOF13..SOF15
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    // Standalone markers carry no length
    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    const sofMarkers = [
      0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
      0xcf,
    ];
    if (sofMarkers.includes(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}

function readWebpDimensions(
  buffer: Buffer,
): { width: number; height: number } | null {
  const chunk = buffer.toString('ascii', 12, 16);

  if (chunk === 'VP8X') {
    // VP8X extended: width-1 and height-1 stored as 24-bit little-endian
    const width =
      1 + ((buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)) & 0xffffff);
    const height =
      1 + ((buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)) & 0xffffff);
    return { width, height };
  }

  if (chunk === 'VP8 ') {
    // Lossy VP8: width/height stored as 16-bit little-endian after 3-byte
    // frame tag + start code (0x9d 0x01 0x2a)
    const width = buffer.readUInt16LE(26);
    const height = buffer.readUInt16LE(28);
    return { width, height };
  }

  if (chunk === 'VP8L') {
    // Lossless VP8L: 14-bit width/height packed into 4 bytes
    const b0 = buffer[21];
    const b1 = buffer[22];
    const b2 = buffer[23];
    const b3 = buffer[24];
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { width, height };
  }

  return null;
}

export function extensionFor(format: ImageFormat): string {
  if (format === 'jpeg') return '.jpg';
  return `.${format}`;
}
