'use client';

import { useState } from 'react';
import { useCheckIn } from '@/hooks/useSchedules';

interface Props {
  scheduleId: string;
  userName: string;
  disabled?: boolean;
}

export default function CheckInButton({ scheduleId, userName, disabled }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const checkIn = useCheckIn();

  const handle = () => {
    checkIn.mutate(scheduleId, { onSuccess: () => setShowConfirm(false) });
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={disabled || checkIn.isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        Check-in
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Confirmar Check-in</h3>
            <p className="text-gray-600">
              Registrar entrada de <strong>{userName}</strong> às{' '}
              <strong>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>?
            </p>
            {checkIn.isError && (
              <p className="text-sm text-red-600">Erro ao registrar. Tente novamente.</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handle}
                disabled={checkIn.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {checkIn.isPending ? 'Registrando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
