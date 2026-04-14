import PDFDocument from 'pdfkit';
import type { Response } from 'express';

export interface PDFSection {
  title: string;
  content: string | Record<string, unknown>[] | null;
  type: 'text' | 'table' | 'kpi';
  columns?: string[];
  headers?: Record<string, string>;
}

export interface PDFReportOptions {
  title: string;
  subtitle: string;
  houseName: string;
  period: string;
  sections: PDFSection[];
}

/** Stream a PDF report directly to the HTTP response. */
export function streamPDFReport(res: Response, options: PDFReportOptions): void {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="relatorio-${Date.now()}.pdf"`,
  );
  doc.pipe(res);

  // ── Header ──────────────────────────────────────────────────────────────────
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(options.title, { align: 'center' });

  doc
    .fontSize(12)
    .font('Helvetica')
    .text(options.houseName, { align: 'center' })
    .text(`Período: ${options.period}`, { align: 'center' })
    .text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })
    .moveDown(1);

  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.5);

  // ── Sections ─────────────────────────────────────────────────────────────────
  for (const section of options.sections) {
    if (!section.content) continue;

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(section.title)
      .moveDown(0.3);

    doc.fontSize(10).font('Helvetica');

    if (section.type === 'text' && typeof section.content === 'string') {
      doc.text(section.content).moveDown(0.8);
      continue;
    }

    if (section.type === 'kpi' && Array.isArray(section.content)) {
      for (const row of section.content) {
        const label = String(row['label'] ?? '');
        const value = String(row['value'] ?? '');
        doc.text(`${label}: ${value}`, { continued: false });
      }
      doc.moveDown(0.8);
      continue;
    }

    if (section.type === 'table' && Array.isArray(section.content)) {
      const cols = section.columns ?? Object.keys(section.content[0] ?? {});
      const headers = section.headers ?? {};

      // Table header
      doc.font('Helvetica-Bold');
      const colWidth = Math.floor(495 / cols.length);
      let x = 50;
      const startY = doc.y;

      for (const col of cols) {
        doc.text(headers[col] ?? col, x, startY, { width: colWidth, lineBreak: false });
        x += colWidth;
      }
      doc.moveDown(0.4);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(0.2);

      // Table rows
      doc.font('Helvetica');
      for (const row of section.content.slice(0, 50)) {
        if (doc.y > 700) {
          doc.addPage();
        }
        x = 50;
        const rowY = doc.y;
        for (const col of cols) {
          const cell = String((row as Record<string, unknown>)[col] ?? '');
          doc.text(cell, x, rowY, { width: colWidth, lineBreak: false });
          x += colWidth;
        }
        doc.moveDown(0.4);
      }

      if (section.content.length > 50) {
        doc.font('Helvetica').text(`... e mais ${section.content.length - 50} registros`);
      }

      doc.moveDown(0.8);
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  doc
    .moveDown(1)
    .fontSize(8)
    .fillColor('#888888')
    .text(`CasaGeri — Sistema de Gestão Geriátrica`, { align: 'center' });

  doc.end();
}
