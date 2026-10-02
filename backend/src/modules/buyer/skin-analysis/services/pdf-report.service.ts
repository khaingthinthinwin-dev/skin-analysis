import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import {
  AnalysisResultDto,
  AnalysisHistoryItemDto,
  ConditionDto,
  TrendPointDto,
} from '../types/skin-analysis.types';

const PAGE_MARGIN = 50;
const PAGE_RIGHT_EDGE = 545;
const CONTENT_WIDTH = PAGE_RIGHT_EDGE - PAGE_MARGIN;

const SEVERITY_COLORS: Record<string, string> = {
  NONE: '#16a34a',
  MILD: '#ca8a04',
  MODERATE: '#ea580c',
  SEVERE: '#dc2626',
};

const DAILY_ROUTINE = {
  badge: 'AM · PM',
  tip: 'Introduce one new product at a time and patch test before full use.',
  morning: {
    label: 'Morning',
    desc: 'Protect and hydrate for the day ahead',
    steps: [
      {
        name: 'Gentle Cleanser',
        desc: 'Rinse away overnight oil with a mild, sulfate-free wash.',
      },
      {
        name: 'Antioxidant Serum',
        desc: 'Apply 2–3 drops of vitamin C to brighten and even skin tone.',
      },
      {
        name: 'Light Moisturizer',
        desc: 'Lock in hydration with a lightweight gel-cream.',
      },
      {
        name: 'Sunscreen SPF 50',
        desc: 'Reapply every 2 hours when you are outdoors.',
      },
    ],
  },
  evening: {
    label: 'Evening',
    desc: 'Cleanse, treat and repair overnight',
    steps: [
      {
        name: 'Double Cleanse',
        desc: 'Start with an oil cleanser, then a gentle foaming wash.',
      },
      {
        name: 'Exfoliate 2–3× a week',
        desc: 'Use BHA on the T-zone to keep pores clear.',
      },
      {
        name: 'Treatment Serum',
        desc: 'Apply niacinamide or retinoid to target areas.',
      },
      {
        name: 'Night Cream',
        desc: 'Seal in moisture with a ceramide-rich cream.',
      },
    ],
  },
} as const;

type RoutinePeriod = {
  label: string;
  desc: string;
  steps: ReadonlyArray<{ name: string; desc: string }>;
};

export interface PdfReportData {
  reportId: string;
  generatedAt: Date;
  buyerLabel: string;
  analysis: AnalysisResultDto;
  scanImage?: { buffer: Buffer; type: string } | null;
}

export interface PdfHistoryReportData {
  reportId: string;
  generatedAt: Date;
  buyerLabel: string;
  items: AnalysisHistoryItemDto[];
  summary: {
    totalAnalyses: number;
    bestScore: number;
    averageHydration: number;
    firstAnalysisDate: string | null;
    latestAnalysisDate: string | null;
  };
  healthScoreTrend: TrendPointDto[];
  hydrationTrend: TrendPointDto[];
}

@Injectable()
export class PdfReportService {
  private readonly logger = new Logger(PdfReportService.name);

  /**
   * Renders a single-analysis clinical PDF report. Returns the raw PDF bytes.
   */
  async buildReport(data: PdfReportData): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    const finished = new Promise<void>((resolve, reject) => {
      doc.on('end', () => resolve());
      doc.on('error', (err) => reject(err));
    });

    this.renderHeader(
      doc,
      'Skin Analysis Clinical Report',
      data.generatedAt,
      data.buyerLabel,
    );

    const { analysis } = data;

    // Key metrics
    this.metricsRow(doc, analysis);

    // Scan image if available
    if (data.scanImage?.buffer) {
      this.renderScanImage(doc, data.scanImage.buffer, data.scanImage.type);
    }

    // Conditions table
    this.renderConditions(doc, analysis.conditions);

    // Daily routine
    this.renderDailyRoutine(doc);

    doc.moveDown();
    if (analysis.findings.overallAssessment) {
      doc
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Overall Assessment');
      doc.moveDown(0.2);
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor('#374151')
        .text(analysis.findings.overallAssessment);
    }

    doc.moveDown();
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Product Recommendations');
    doc.moveDown(0.4);
    if (analysis.recommendations.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#374151')
        .text('No matching products were identified.');
    } else {
      for (const rec of analysis.recommendations) {
        doc
          .fillColor('#111827')
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(`${rec.productName} — ${rec.productType}`);
        if (rec.priority) {
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(this.priorityColor(rec.priority))
            .text(`Priority: ${rec.priority}`);
        }
        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor('#374151')
          .text(rec.reason);
        doc.moveDown(0.6);
      }
    }

    doc.moveDown(1);
    doc
      .fontSize(8)
      .fillColor('#6b7280')
      .text(
        `Report ID: ${data.reportId} · Generated: ${data.generatedAt.toISOString()}`,
      );
    doc.moveDown(0.25);
    doc.text(
      'This report is generated for informational purposes and is not a medical diagnosis.',
    );

    doc.end();
    await finished;
    return Buffer.concat(chunks);
  }

  private uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      const k = key(item);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  /**
   * Renders the daily skincare routine (morning + evening) with a tip box.
   */
  private renderDailyRoutine(doc: PDFKit.PDFDocument) {
    if (doc.y + 250 > doc.page.maxY()) doc.addPage();
    doc.moveDown();
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Daily Routine');
    const titleWidth = doc.widthOfString('Daily Routine');
    doc
      .fillColor('#7c3aed')
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .text(DAILY_ROUTINE.badge, PAGE_MARGIN + titleWidth + 8, doc.y);
    doc.moveDown(0.5);

    const colGap = 20;
    const colW = (CONTENT_WIDTH - colGap) / 2;
    const startY = doc.y;
    const morningEnd = this.renderRoutinePeriod(
      doc,
      PAGE_MARGIN,
      colW,
      startY,
      DAILY_ROUTINE.morning,
    );
    const eveningEnd = this.renderRoutinePeriod(
      doc,
      PAGE_MARGIN + colW + colGap,
      colW,
      startY,
      DAILY_ROUTINE.evening,
    );

    doc.x = PAGE_MARGIN;
    doc.y = Math.max(morningEnd, eveningEnd) + 4;

    const tipY = doc.y;
    const tipH = doc.heightOfString(DAILY_ROUTINE.tip, {
      width: CONTENT_WIDTH - 12,
    });
    doc.rect(PAGE_MARGIN, tipY - 3, CONTENT_WIDTH, tipH + 10).fill('#f5f3ff');
    doc
      .fillColor('#6d28d9')
      .font('Helvetica-Oblique')
      .fontSize(8)
      .text(DAILY_ROUTINE.tip, PAGE_MARGIN + 6, tipY + 1, {
        width: CONTENT_WIDTH - 12,
      });
    doc.x = PAGE_MARGIN;
    doc.y = tipY + tipH + 10;
  }

  private renderRoutinePeriod(
    doc: PDFKit.PDFDocument,
    x: number,
    width: number,
    startY: number,
    period: RoutinePeriod,
  ): number {
    let y = startY;
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(period.label, x, y);
    y += 13;
    doc.fillColor('#6b7280').font('Helvetica').fontSize(8);
    const descH = doc.heightOfString(period.desc, { width });
    doc.text(period.desc, x, y, { width });
    y += descH + 7;

    period.steps.forEach((step, index) => {
      doc.circle(x + 5, y + 4, 4.5).fill('#7c3aed');
      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(6)
        .text(String(index + 1), x + 0.5, y + 2.2, {
          width: 9,
          align: 'center',
        });
      doc
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(step.name, x + 14, y);
      y += 12;
      doc.fillColor('#6b7280').font('Helvetica').fontSize(8);
      const stepH = doc.heightOfString(step.desc, { width: width - 14 });
      doc.text(step.desc, x + 14, y, { width: width - 14 });
      y += stepH + 7;
    });

    return y;
  }

  /**
   * Renders a longitudinal PDF report across the buyer's analysis history.
   */
  async buildHistoryReport(data: PdfHistoryReportData): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    const finished = new Promise<void>((resolve, reject) => {
      doc.on('end', () => resolve());
      doc.on('error', (err) => reject(err));
    });

    this.renderHeader(
      doc,
      'Skin Analysis Full History Report',
      data.generatedAt,
      data.buyerLabel,
    );

    const { summary } = data;
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Summary');
    doc.moveDown(0.5);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#374151')
      .text(`Total Analyses: ${summary.totalAnalyses}`)
      .text(`Best Health Score: ${summary.bestScore}`)
      .text(`Average Hydration: ${summary.averageHydration}%`)
      .text(
        `Period: ${summary.firstAnalysisDate ? new Date(summary.firstAnalysisDate).toISOString().slice(0, 10) : '—'} → ${summary.latestAnalysisDate ? new Date(summary.latestAnalysisDate).toISOString().slice(0, 10) : '—'}`,
      );

    doc.moveDown(1);
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('History');
    doc.moveDown(0.4);
    const items = this.uniqueBy(data.items, (item) => item.analysisId);
    if (items.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#374151')
        .text('No analyses recorded yet.');
    } else {
      this.table(
        doc,
        ['Date', 'Health Score', 'Hydration', 'Skin Type', 'Status'],
        items.map((item) => [
          new Date(item.analysisDate).toISOString().slice(0, 10),
          String(item.healthScore),
          `${item.hydration}%`,
          item.skinType,
          item.status,
        ]),
      );
    }

    doc.moveDown(1);
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Health Score Trend');
    doc.moveDown(0.4);
    this.renderLineChart(doc, data.healthScoreTrend, '#0ea5e9');

    doc.moveDown(0.8);
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Hydration Trend');
    doc.moveDown(0.4);
    this.renderLineChart(doc, data.hydrationTrend, '#22c55e');

    doc.moveDown(1.2);
    doc
      .fontSize(8)
      .fillColor('#6b7280')
      .text(
        `Report ID: ${data.reportId} · Generated: ${data.generatedAt.toISOString()}`,
      );
    doc.moveDown(0.25);
    doc.text(
      'This report is generated for informational purposes and is not a medical diagnosis.',
    );

    doc.end();
    await finished;
    return Buffer.concat(chunks);
  }

  private renderHeader(
    doc: PDFKit.PDFDocument,
    title: string,
    generatedAt: Date,
    buyerLabel: string,
  ) {
    doc
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(18)
      .text('Cosmetics Finder');
    doc.fontSize(8).fillColor('#64748b').text('AI Skin Analysis');
    doc.moveDown(0.5);
    doc
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    doc.moveDown(0.5);
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(14).text(title);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#6b7280')
      .text(`${buyerLabel} · ${generatedAt.toISOString()}`);
    doc.moveDown(1);
  }

  private metricsRow(doc: PDFKit.PDFDocument, analysis: AnalysisResultDto) {
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Metrics');
    doc.moveDown(0.5);
    const cols: Array<[string, string]> = [
      ['Health Score', `${analysis.healthScore ?? 0}/100`],
      ['Hydration', `${analysis.hydration ?? 0}%`],
      ['Skin Type', analysis.skinType ?? '—'],
      ['Est. Skin Age', String(analysis.skinAge ?? '—')],
      ['Confidence', `${analysis.confidence ?? 0}%`],
    ];
    this.metricGrid(doc, cols);
    doc.moveDown(1);
  }

  private metricGrid(doc: PDFKit.PDFDocument, cols: Array<[string, string]>) {
    const startX = 50;
    const startY = doc.y;
    const colW = 99;
    const colH = 54;
    cols.forEach(([label, value], index) => {
      const x = startX + index * colW;
      if (x + colW > 545) return;
      doc
        .roundedRect(x, startY, colW - 4, colH, 4)
        .strokeColor('#e5e7eb')
        .lineWidth(1)
        .stroke();
      doc
        .fillColor('#6b7280')
        .font('Helvetica')
        .fontSize(7.5)
        .text(label, x + 8, startY + 8, { width: colW - 16 });
      doc
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(value, x + 8, startY + 22, { width: colW - 16 });
    });
    doc.x = PAGE_MARGIN;
    doc.moveDown(colH / 28 + 1);
  }

  private renderScanImage(
    doc: PDFKit.PDFDocument,
    buffer: Buffer,
    _type: string,
  ) {
    try {
      const size = 200;
      if (doc.y + 40 + size > doc.page.maxY()) doc.addPage();
      doc.moveDown(0.5);
      doc
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Facial Scan');
      doc.moveDown(0.4);
      const x = PAGE_MARGIN;
      const y = Math.round(doc.y);
      doc
        .roundedRect(x, y, size, size, 4)
        .lineWidth(1)
        .strokeColor('#e5e7eb')
        .stroke();
      doc.image(buffer, x, y, {
        width: size,
        height: size,
        fit: [size, size],
        align: 'center',
        valign: 'center',
      });
      doc.x = PAGE_MARGIN;
      doc.y = y + size;
      doc.moveDown(0.6);
    } catch (err) {
      this.logger.warn(
        `Could not embed scan image in PDF: ${(err as Error).message}`,
      );
      doc.x = PAGE_MARGIN;
    }
  }

  private renderConditions(
    doc: PDFKit.PDFDocument,
    conditions: ConditionDto[],
  ) {
    const unique = this.uniqueBy(
      conditions,
      (c) => c.conditionId || `${c.conditionName}|${c.affectedArea}`,
    );
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Skin Conditions');
    doc.moveDown(0.4);
    this.table(
      doc,
      ['Condition', 'Severity', 'Score', 'Affected Area'],
      unique.map((c) => [
        c.conditionName,
        c.severity,
        String(c.severityScore),
        c.affectedArea,
      ]),
      {
        cellColor: (row, colIndex, rowIndex) => {
          if (colIndex === 1 && unique[rowIndex]) {
            const severity = unique[rowIndex].severity;
            doc.fillColor(SEVERITY_COLORS[severity] ?? '#374151');
          }
        },
        rowDetail: (_row, rowIndex) => unique[rowIndex]?.description ?? '',
      },
    );
  }

  private table(
    doc: PDFKit.PDFDocument,
    headers: string[],
    rows: string[][],
    options?: {
      cellColor?: (row: string[], colIndex: number, rowIndex: number) => void;
      rowDetail?: (row: string[], rowIndex: number) => string;
    },
  ) {
    const colW = CONTENT_WIDTH / headers.length;
    const headerH = 20;
    const pageBottom = doc.page.maxY() - 12;
    let y = doc.y;

    const drawHeader = (topY: number) => {
      doc.rect(PAGE_MARGIN, topY, CONTENT_WIDTH, headerH).fill('#f1f5f9');
      headers.forEach((h, i) => {
        doc
          .fillColor('#0f172a')
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(h, PAGE_MARGIN + 4 + i * colW, topY + 6, { width: colW - 8 });
      });
    };

    drawHeader(y);
    y += headerH;

    rows.forEach((row, rIdx) => {
      const detail = options?.rowDetail?.(row, rIdx).trim() ?? '';
      const detailLines = detail ? Math.ceil(detail.length / 130) : 0;
      const rowH = 20 + detailLines * 10;

      if (y + rowH > pageBottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader(y);
        y += headerH;
      }

      doc
        .rect(PAGE_MARGIN, y, CONTENT_WIDTH, rowH)
        .fill(rIdx % 2 === 0 ? '#ffffff' : '#f8fafc');
      row.forEach((cell, cIdx) => {
        doc.fillColor('#374151').font('Helvetica').fontSize(8);
        options?.cellColor?.(row, cIdx, rIdx);
        doc.text(cell, PAGE_MARGIN + 4 + cIdx * colW, y + 6, {
          width: colW - 8,
        });
      });
      if (detail) {
        doc
          .fillColor('#6b7280')
          .font('Helvetica')
          .fontSize(7.5)
          .text(detail, PAGE_MARGIN + 4, y + 21, {
            width: CONTENT_WIDTH - 8,
          });
      }
      y += rowH;
    });

    doc.x = PAGE_MARGIN;
    doc.y = y + 10;
  }

  private renderLineChart(
    doc: PDFKit.PDFDocument,
    points: TrendPointDto[],
    color: string,
  ) {
    if (points.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#6b7280')
        .text('Not enough data points.');
      return;
    }

    const chartX = PAGE_MARGIN;
    const chartW = CONTENT_WIDTH;
    const chartH = 110;
    const labelBand = 16;
    if (doc.y + chartH + labelBand + 8 > doc.page.maxY()) doc.addPage();
    const chartY = doc.y;

    const values = points.map((p) => p.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 100);
    const range = max - min || 1;

    const xStep = points.length > 1 ? chartW / (points.length - 1) : 0;

    doc.strokeColor('#e5e7eb').lineWidth(1);
    doc.rect(chartX, chartY, chartW, chartH).stroke();

    const coords = points.map((p, i) => ({
      x: chartX + i * xStep,
      y: chartY + chartH - ((p.value - min) / range) * chartH,
    }));

    doc.strokeColor(color).lineWidth(2);
    doc.moveTo(coords[0].x, coords[0].y);
    for (const c of coords.slice(1)) doc.lineTo(c.x, c.y);
    doc.stroke();

    doc.fillColor(color);
    for (const c of coords) {
      doc.circle(c.x, c.y, 2.5).fill();
    }

    doc.fillColor('#94a3b8').font('Helvetica').fontSize(6.5);
    doc.text(String(max), chartX + 4, chartY + 3, { width: 40 });
    doc.text(String(min), chartX + 4, chartY + chartH - 10, { width: 40 });

    const labelStep = Math.ceil(points.length / 12);
    coords.forEach((c, i) => {
      if (i % labelStep !== 0 && i !== coords.length - 1) return;
      const lx = Math.max(chartX, Math.min(c.x - 17, PAGE_RIGHT_EDGE - 34));
      doc
        .fillColor('#6b7280')
        .font('Helvetica')
        .fontSize(7)
        .text(points[i].date.slice(5), lx, chartY + chartH + 5, {
          width: 34,
          align: 'center',
        });
    });

    doc.x = PAGE_MARGIN;
    doc.y = chartY + chartH + labelBand + 6;
  }

  private priorityColor(priority: string): string {
    switch (priority) {
      case 'HIGH':
        return '#dc2626';
      case 'MEDIUM':
        return '#d97706';
      default:
        return '#16a34a';
    }
  }
}
