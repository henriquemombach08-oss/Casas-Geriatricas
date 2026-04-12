export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}

export function formatCEP(cep: string): string {
  const digits = cep.replace(/\D/g, '');
  return digits.replace(/(\d{5})(\d{3})/, '$1-$2');
}

export const GENDER_LABELS: Record<string, string> = {
  M: 'Masculino',
  F: 'Feminino',
  O: 'Outro',
};

export const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  discharged: 'Transferido',
};

export const MARITAL_LABELS: Record<string, string> = {
  single: 'Solteiro(a)',
  married: 'Casado(a)',
  widowed: 'Viúvo(a)',
  divorced: 'Divorciado(a)',
};

export const BLOOD_TYPE_LABELS: Record<string, string> = {
  O_pos: 'O+',
  O_neg: 'O-',
  A_pos: 'A+',
  A_neg: 'A-',
  B_pos: 'B+',
  B_neg: 'B-',
  AB_pos: 'AB+',
  AB_neg: 'AB-',
  unknown: 'Desconhecido',
};

export const SEVERITY_LABELS: Record<string, string> = {
  mild: 'Leve',
  moderate: 'Moderada',
  severe: 'Grave',
};

export const CONDITION_STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  controlled: 'Controlado',
  resolved: 'Resolvido',
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  rg: 'RG',
  cpf: 'CPF',
  driver_license: 'CNH',
  passport: 'Passaporte',
  medical_report: 'Laudo Médico',
  insurance: 'Plano de Saúde',
  income_statement: 'Comprovante de Renda',
  other: 'Outro',
};
