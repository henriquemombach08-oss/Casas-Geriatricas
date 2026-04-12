import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ResidentsAPI } from '@/lib/api/residents';
import type { ResidentFilters, CreateResidentInput, UpdateResidentInput } from '@/types/resident';
import toast from 'react-hot-toast';

export function useResidents(filters: ResidentFilters = {}) {
  return useQuery({
    queryKey: ['residents', filters],
    queryFn: () => ResidentsAPI.list(filters),
  });
}

export function useResident(id: string) {
  return useQuery({
    queryKey: ['resident', id],
    queryFn: () => ResidentsAPI.getOne(id),
    enabled: !!id,
  });
}

export function useCreateResident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateResidentInput) => ResidentsAPI.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['residents'] });
      toast.success('Residente criado com sucesso!');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error ?? 'Erro ao criar residente');
    },
  });
}

export function useUpdateResident(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateResidentInput) => ResidentsAPI.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['residents'] });
      void queryClient.invalidateQueries({ queryKey: ['resident', id] });
      toast.success('Residente atualizado!');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error ?? 'Erro ao atualizar residente');
    },
  });
}

export function useRemoveResident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      ResidentsAPI.remove(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['residents'] });
      toast.success('Residente desativado');
    },
    onError: () => toast.error('Erro ao desativar residente'),
  });
}

export function useUploadPhoto(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => ResidentsAPI.uploadPhoto(id, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resident', id] });
      toast.success('Foto atualizada!');
    },
    onError: () => toast.error('Erro ao fazer upload da foto'),
  });
}

export function useUploadDocument(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      meta,
    }: {
      file: File;
      meta: { type: string; name?: string; issueDate?: string; expiresAt?: string };
    }) => ResidentsAPI.uploadDocument(id, file, meta),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resident', id] });
      toast.success('Documento enviado!');
    },
    onError: () => toast.error('Erro ao fazer upload do documento'),
  });
}
