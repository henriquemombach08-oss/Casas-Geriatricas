'use client';

import { useState } from 'react';

interface ExportButtonsProps {
  onExportPDF?: () => Promise<void>;
  onExportExcel?: () => Promise<void>;
  period?: string;
  label?: string;
}

export default function ExportButtons({ onExportPDF, onExportExcel, label = 'Exportar' }: ExportButtonsProps) {
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);

  const handlePDF = async () => {
    if (!onExportPDF) return;
    setLoadingPDF(true);
    try { await onExportPDF(); } finally { setLoadingPDF(false); }
  };

  const handleExcel = async () => {
    if (!onExportExcel) return;
    setLoadingExcel(true);
    try { await onExportExcel(); } finally { setLoadingExcel(false); }
  };

  return (
    <div className="flex items-center gap-2">
      {onExportPDF && (
        <button
          onClick={handlePDF}
          disabled={loadingPDF}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          ⬇
          {loadingPDF ? 'Gerando...' : `${label} PDF`}
        </button>
      )}
      {onExportExcel && (
        <button
          onClick={handleExcel}
          disabled={loadingExcel}
          className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
        >
          ⬇
          {loadingExcel ? 'Gerando...' : `${label} Excel`}
        </button>
      )}
    </div>
  );
}
