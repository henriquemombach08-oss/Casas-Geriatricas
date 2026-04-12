import { isValidCPF, calculateAge, getDocumentStatus, formatCPF } from '../lib/validators';

// ─── CPF Validation ───────────────────────────────────────────────────────────

describe('isValidCPF', () => {
  it('accepts a valid CPF', () => {
    expect(isValidCPF('11144477735')).toBe(true);
  });

  it('rejects CPF with all same digits', () => {
    expect(isValidCPF('11111111111')).toBe(false);
    expect(isValidCPF('00000000000')).toBe(false);
    expect(isValidCPF('99999999999')).toBe(false);
  });

  it('rejects CPF with invalid check digits', () => {
    expect(isValidCPF('12345678900')).toBe(false);
  });

  it('rejects CPF with non-numeric characters', () => {
    expect(isValidCPF('123456789ab')).toBe(false);
  });

  it('rejects CPF with wrong length', () => {
    expect(isValidCPF('1234567')).toBe(false);
    expect(isValidCPF('123456789001')).toBe(false);
  });
});

// ─── formatCPF ────────────────────────────────────────────────────────────────

describe('formatCPF', () => {
  it('formats CPF correctly', () => {
    expect(formatCPF('11144477735')).toBe('111.444.777-35');
  });
});

// ─── calculateAge ─────────────────────────────────────────────────────────────

describe('calculateAge', () => {
  it('calculates age correctly', () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 80);
    expect(calculateAge(birthDate)).toBe(80);
  });

  it('returns age before birthday in same year', () => {
    const today = new Date();
    const birth = new Date(today.getFullYear() - 75, today.getMonth() + 1, 1);
    expect(calculateAge(birth)).toBe(74);
  });
});

// ─── getDocumentStatus ───────────────────────────────────────────────────────

describe('getDocumentStatus', () => {
  it('returns valid for future date beyond 7 days', () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    expect(getDocumentStatus(future)).toBe('valid');
  });

  it('returns expiring_soon within 7 days', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    expect(getDocumentStatus(soon)).toBe('expiring_soon');
  });

  it('returns expired for past date', () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    expect(getDocumentStatus(past)).toBe('expired');
  });

  it('returns valid when no expiry date', () => {
    expect(getDocumentStatus(null)).toBe('valid');
    expect(getDocumentStatus(undefined)).toBe('valid');
  });
});
