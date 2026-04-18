'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

interface PinConfirmState {
  isOpen: boolean;
  loading: boolean;
  error: string;
}

export function usePinConfirm() {
  const [state, setState] = useState<PinConfirmState>({ isOpen: false, loading: false, error: '' });
  const [resolveRef, setResolveRef] = useState<((pin: string | null) => void) | null>(null);

  const requestPin = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      setState({ isOpen: true, loading: false, error: '' });
      setResolveRef(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(
    async (pin: string) => {
      setState((s) => ({ ...s, loading: true, error: '' }));
      try {
        await api.post('/pin/verify', { pin });
        setState({ isOpen: false, loading: false, error: '' });
        resolveRef?.(pin);
      } catch {
        setState((s) => ({ ...s, loading: false, error: 'PIN incorreto. Tente novamente.' }));
      }
    },
    [resolveRef],
  );

  const handleCancel = useCallback(() => {
    setState({ isOpen: false, loading: false, error: '' });
    resolveRef?.(null);
  }, [resolveRef]);

  return {
    pinModalProps: {
      isOpen: state.isOpen,
      loading: state.loading,
      error: state.error,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
    requestPin,
  };
}
