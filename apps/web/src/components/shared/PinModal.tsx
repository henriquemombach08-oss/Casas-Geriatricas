'use client';

import { useState, useRef, useEffect } from 'react';

interface PinModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  onConfirm: (pin: string) => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
}

export function PinModal({
  isOpen,
  title = 'Confirmação de segurança',
  description = 'Digite seu PIN de 6 dígitos para confirmar esta ação.',
  onConfirm,
  onCancel,
  loading = false,
  error,
}: PinModalProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDigits(Array(6).fill(''));
      setTimeout(() => inputs.current[0]?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) inputs.current[index + 1]?.focus();
    if (next.every((d) => d !== '') && next.join('').length === 6) {
      onConfirm(next.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
    if (e.key === 'Escape') onCancel();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      setDigits(next);
      onConfirm(pasted);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <div className="text-center">
            <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
            <p className="text-sm text-stone-500 mt-1">{description}</p>
          </div>

          <div className="flex gap-3 mt-2" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all
                  ${error ? 'border-red-400 bg-red-50' : d ? 'border-blue-500 bg-blue-50' : 'border-stone-200 bg-stone-50'}
                  focus:border-blue-500 focus:bg-blue-50 disabled:opacity-50`}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Verificando...
            </div>
          )}

          <button
            onClick={onCancel}
            disabled={loading}
            className="mt-2 text-sm text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
