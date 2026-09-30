import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import {
  AnalysisResultDto,
  AnalysisHistoryItemDto,
  ConditionDto,
  TrendPointDto,
} from '../types/skin-analysis.types';

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

const SEVERITY_COLORS: Record<string, string> = {
  NONE: '#16a34a',
  MILD: '#ca8a04',
  MODERATE: '#ea580c',
  SEVERE: '#dc2626',
};

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

    doc.moveDown();
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Clinical Findings');
    doc.moveDown(0.4);
    const allFindings = [
      ...analysis.findings.primaryConcerns,
      ...analysis.findings.secondaryConcerns,
    ];
    if (allFindings.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#374151')
        .text('No clinical findings to report.');
    } else {
      for (const finding of allFindings) {
        doc
          .fillColor('#111827')
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(finding.title);
        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor('#374151')
          .text(`${finding.severity} · ${finding.affectedArea}`);
        doc.moveDown(0.2);
        doc.text(finding.description);
        doc.moveDown(0.6);
      }
    }

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
      'Cosmetics Finder · AI Skin Analysis. This report is generated for informational purposes and is not a medical diagnosis.',
    );

    doc.end();
    await finished;
    return Buffer.concat(chunks);
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
    if (data.items.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#374151')
        .text('No analyses recorded yet.');
    } else {
      this.table(
        doc,
        ['Date', 'Health Score', 'Hydration', 'Skin Type', 'Status'],
        data.items.map((item) => [
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
      'Cosmetics Finder · AI Skin Analysis. This report is generated for informational purposes and is not a medical diagnosis.',
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
    doc.moveDown(colH / 28 + 1);
  }

  private renderScanImage(
    doc: PDFKit.PDFDocument,
    buffer: Buffer,
    _type: string,
  ) {
    try {
      doc.moveDown(0.5);
      doc
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Facial Scan');
      doc.moveDown(0.4);
      doc.image(buffer, 50, doc.y, { width: 200, fit: [200, 200] });
      doc.moveDown(5.5);
    } catch (err) {
      this.logger.warn(
        `Could not embed scan image in PDF: ${(err as Error).message}`,
      );
    }
  }

  private renderConditions(
    doc: PDFKit.PDFDocument,
    conditions: ConditionDto[],
  ) {
    doc
      .fillColor('#111827')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Skin Conditions');
    doc.moveDown(0.4);
    this.table(
      doc,
      ['Condition', 'Severity', 'Score', 'Affected Area'],
      conditions.map((c) => [
        c.conditionName,
        c.severity,
        String(c.severityScore),
        c.affectedArea,
      ]),
      (row, colIndex, rowIndex) => {
        if (colIndex === 1 && conditions[rowIndex]) {
          const severity = conditions[rowIndex].severity;
          doc.fillColor(SEVERITY_COLORS[severity] ?? '#374151');
        }
      },
    );
  }

  private table(
    doc: PDFKit.PDFDocument,
    headers: string[],
    rows: string[][],
    cellColor?: (row: string[], colIndex: number, rowIndex: number) => void,
  ) {
    const colW = 495 / headers.length;
    const topY = doc.y;
    const rowH = 20;

    doc.rect(50, topY, colW * headers.length, rowH).fill('#f1f5f9');
    headers.forEach((h, i) => {
      doc
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(h, 54 + i * colW, topY + 6, { width: colW - 8 });
    });

    rows.forEach((row, rIdx) => {
      const y = topY + rowH + rIdx * rowH;
      if (rIdx % 2 === 0) {
        doc.rect(50, y, colW * headers.length, rowH).fill('#ffffff');
      }
      if (rIdx % 2 === 1) {
        doc.rect(50, y, colW * headers.length, rowH).fill('#f8fafc');
      }
      row.forEach((cell, cIdx) => {
        doc.fillColor('#374151').font('Helvetica').fontSize(8);
        if (cellColor) cellColor(row, cIdx, rIdx);
        doc.text(cell, 54 + cIdx * colW, y + 6, { width: colW - 8 });
      });
    });

    doc.moveDown((rows.length * rowH) / 28 + 1);
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

    const chartX = 60;
    const chartY = doc.y;
    const chartW = 220;
    const chartH = 110;

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

    doc.fillColor('#6b7280').font('Helvetica').fontSize(7);
    coords.forEach((c, i) => {
      doc.text(points[i].date.slice(0, 6), c.x - 10, chartY + chartH + 4, {
        width: 30,
        align: 'center',
      });
    });

    doc.moveDown(chartH / 28 + 1.5);
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
