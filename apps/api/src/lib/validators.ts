// ─── CPF ─────────────────────────────────────────────────────────────────────

export function isValidCPF(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false;
  // Reject all same digits (00000000000, 11111111111, ...)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

export function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function stripCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

// ─── Phone ───────────────────────────────────────────────────────────────────

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}

export function stripPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// ─── CEP ─────────────────────────────────────────────────────────────────────

export function isValidCEP(cep: string): boolean {
  return /^\d{5}-\d{3}$/.test(cep) || /^\d{8}$/.test(cep.replace('-', ''));
}

// ─── Age ─────────────────────────────────────────────────────────────────────

export function calculateAge(birthDate: Date | string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ─── Document status ──────────────────────────────────────────────────────────

export function getDocumentStatus(expiresAt?: Date | null): 'valid' | 'expiring_soon' | 'expired' {
  if (!expiresAt) return 'valid';
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (expiresAt < now) return 'expired';
  if (expiresAt <= sevenDays) return 'expiring_soon';
  return 'valid';
}
