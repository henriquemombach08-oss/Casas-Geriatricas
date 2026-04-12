'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useUploadPhoto } from '@/hooks/useResidents';

interface Props {
  residentId: string;
  currentPhotoUrl?: string;
  name: string;
}

export function PhotoUpload({ residentId, currentPhotoUrl, name }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { mutate, isPending } = useUploadPhoto(residentId);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) mutate(file);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-32 h-32 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 cursor-pointer group"
        onClick={() => fileRef.current?.click()}
      >
        {currentPhotoUrl ? (
          <Image src={currentPhotoUrl} alt={name} fill className="object-cover" sizes="128px" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <span className="text-3xl">👤</span>
            <span className="text-xs mt-1">Sem foto</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs font-medium">
            {isPending ? 'Enviando...' : 'Alterar foto'}
          </span>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
        disabled={isPending}
      />

      <p className="text-xs text-gray-400">JPEG, PNG • Máx 5MB</p>
    </div>
  );
}
