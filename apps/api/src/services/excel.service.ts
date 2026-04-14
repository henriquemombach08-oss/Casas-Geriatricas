import * as XLSX from 'xlsx';
import type { Response } from 'express';

export interface ExcelSheet {
  name: string;
  headers: Record<string, string>; // key → label
  rows: Record<string, unknown>[];
}

/** Stream an Excel workbook directly to the HTTP response. */
export function streamExcelReport(
  res: Response,
  filename: string,
  sheets: ExcelSheet[],
): void {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const keys = Object.keys(sheet.headers);
    const headerRow = keys.map((k) => sheet.headers[k] ?? k);

    const data: unknown[][] = [headerRow];
    for (const row of sheet.rows) {
      data.push(keys.map((k) => row[k] ?? ''));
    }

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-width columns
    const colWidths = headerRow.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...sheet.rows.map((r) => String(r[keys[i]!] ?? '').length),
      );
      return { wch: Math.min(maxLen + 2, 40) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}-${Date.now()}.xlsx"`,
  );
  res.send(buffer);
}
