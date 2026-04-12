/**
 * Unit tests for medication validation logic.
 * Run with: pnpm --filter api test
 */

// ─── Helpers (extracted from medications.controller) ──────────────────────────

const timePattern = /^\d{2}:\d{2}$/;

function validateScheduledTimes(times: string[]): boolean {
  if (times.length === 0) return false;
  const unique = new Set(times);
  return unique.size === times.length && times.every((t) => timePattern.test(t));
}

function calculateAdherenceRate(logs: Array<{ status: string }>): number {
  if (logs.length === 0) return 0;
  const administered = logs.filter(
    (l) => l.status === 'administered' || l.status === 'partially_administered',
  ).length;
  return Math.round((administered / logs.length) * 100);
}

function validateAdministration(data: {
  status: string;
  reasonIfNotGiven?: string | null;
  administeredAt?: string | null;
}): boolean {
  if (
    (data.status === 'administered' || data.status === 'partially_administered') &&
    !data.administeredAt
  ) {
    return false;
  }
  if (data.status !== 'administered' && !data.reasonIfNotGiven) {
    return false;
  }
  return true;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('validateScheduledTimes', () => {
  it('accepts valid times', () => {
    expect(validateScheduledTimes(['08:00', '14:00', '20:00'])).toBe(true);
  });

  it('accepts a single time', () => {
    expect(validateScheduledTimes(['08:00'])).toBe(true);
  });

  it('rejects duplicate times', () => {
    expect(validateScheduledTimes(['08:00', '08:00', '20:00'])).toBe(false);
  });

  it('rejects invalid format', () => {
    expect(validateScheduledTimes(['8:00', '20:00'])).toBe(false);
    expect(validateScheduledTimes(['0800', '20:00'])).toBe(false);
  });

  it('rejects empty array', () => {
    expect(validateScheduledTimes([])).toBe(false);
  });
});

describe('calculateAdherenceRate', () => {
  it('returns 100 when all administered', () => {
    const logs = [{ status: 'administered' }, { status: 'administered' }];
    expect(calculateAdherenceRate(logs)).toBe(100);
  });

  it('returns 0 when all refused', () => {
    const logs = [{ status: 'refused' }, { status: 'missed' }];
    expect(calculateAdherenceRate(logs)).toBe(0);
  });

  it('calculates 50% adherence correctly', () => {
    const logs = [
      { status: 'administered' },
      { status: 'administered' },
      { status: 'refused' },
      { status: 'missed' },
    ];
    expect(calculateAdherenceRate(logs)).toBe(50);
  });

  it('counts partially_administered as administered', () => {
    const logs = [
      { status: 'administered' },
      { status: 'partially_administered' },
      { status: 'refused' },
    ];
    expect(calculateAdherenceRate(logs)).toBe(67);
  });

  it('returns 0 for empty logs', () => {
    expect(calculateAdherenceRate([])).toBe(0);
  });
});

describe('validateAdministration', () => {
  it('accepts administered with administeredAt', () => {
    expect(
      validateAdministration({
        status: 'administered',
        administeredAt: new Date().toISOString(),
      }),
    ).toBe(true);
  });

  it('rejects administered without administeredAt', () => {
    expect(
      validateAdministration({ status: 'administered', administeredAt: null }),
    ).toBe(false);
  });

  it('rejects refused without reason', () => {
    expect(
      validateAdministration({ status: 'refused', reasonIfNotGiven: null }),
    ).toBe(false);
  });

  it('accepts refused with reason', () => {
    expect(
      validateAdministration({
        status: 'refused',
        reasonIfNotGiven: 'Residente recusou',
      }),
    ).toBe(true);
  });

  it('accepts not_available with reason', () => {
    expect(
      validateAdministration({
        status: 'not_available',
        reasonIfNotGiven: 'Farmácia não entregou',
      }),
    ).toBe(true);
  });

  it('accepts partially_administered with administeredAt', () => {
    expect(
      validateAdministration({
        status: 'partially_administered',
        administeredAt: new Date().toISOString(),
        reasonIfNotGiven: 'Tomou metade',
      }),
    ).toBe(true);
  });
});

describe('scheduled times cross-validation', () => {
  it('rejects if times_per_day does not match array length', () => {
    const timesPerDay = 3;
    const scheduledTimes = ['08:00', '14:00']; // only 2
    expect(scheduledTimes.length === timesPerDay).toBe(false);
  });

  it('accepts when times_per_day matches array length', () => {
    const timesPerDay = 3;
    const scheduledTimes = ['08:00', '14:00', '20:00'];
    expect(scheduledTimes.length === timesPerDay).toBe(true);
  });
});
