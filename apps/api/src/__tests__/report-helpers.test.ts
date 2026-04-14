import {
  calculateAdherence,
  adherenceTrend,
  staffTrend,
  buildMonthRange,
  parsePeriodParam,
  monthToRange,
  formatMonthLabel,
} from '../lib/report-helpers';

describe('calculateAdherence', () => {
  it('returns 0 when total_prescribed is 0', () => {
    expect(calculateAdherence({ total_prescribed: 0, administered: 0, refused: 0, missed: 0 })).toBe(0);
  });

  it('returns 100 when all prescribed were administered', () => {
    expect(calculateAdherence({ total_prescribed: 10, administered: 10, refused: 0, missed: 0 })).toBe(100);
  });

  it('returns 75 for 3/4 administered', () => {
    expect(calculateAdherence({ total_prescribed: 4, administered: 3, refused: 1, missed: 0 })).toBe(75);
  });

  it('rounds to 1 decimal', () => {
    expect(calculateAdherence({ total_prescribed: 3, administered: 2, refused: 1, missed: 0 })).toBe(66.7);
  });
});

describe('adherenceTrend', () => {
  it('returns up when current exceeds previous by more than 1', () => {
    expect(adherenceTrend(90, 85)).toBe('up');
  });

  it('returns down when current is below previous by more than 1', () => {
    expect(adherenceTrend(80, 85)).toBe('down');
  });

  it('returns stable when within 1 point', () => {
    expect(adherenceTrend(85, 85)).toBe('stable');
    expect(adherenceTrend(85.5, 85)).toBe('stable');
  });
});

describe('staffTrend', () => {
  it('returns excellent for high punctuality and low absence', () => {
    expect(staffTrend(97, 1)).toBe('excellent');
  });

  it('returns good for moderate performance', () => {
    expect(staffTrend(88, 5)).toBe('good');
  });

  it('returns fair for below average performance', () => {
    expect(staffTrend(75, 10)).toBe('fair');
  });

  it('returns poor for low performance', () => {
    expect(staffTrend(60, 20)).toBe('poor');
  });
});

describe('buildMonthRange', () => {
  it('returns an array of length N', () => {
    const months = buildMonthRange('2026-04', 6);
    expect(months).toHaveLength(6);
  });

  it('ends with the given month', () => {
    const months = buildMonthRange('2026-04', 3);
    expect(months[months.length - 1]).toBe('2026-04');
  });

  it('produces sequential months', () => {
    const months = buildMonthRange('2026-03', 3);
    expect(months).toEqual(['2026-01', '2026-02', '2026-03']);
  });
});

describe('monthToRange', () => {
  it('returns start on day 1', () => {
    const { start } = monthToRange('2026-04');
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(3); // April = 3
  });

  it('returns end as first day of next month', () => {
    const { end } = monthToRange('2026-04');
    expect(end.getMonth()).toBe(4); // May = 4
    expect(end.getDate()).toBe(1);
  });
});

describe('parsePeriodParam', () => {
  it('parses a YYYY-MM string', () => {
    const { start, end } = parsePeriodParam('2026-01');
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(0);
    expect(end.getMonth()).toBe(1);
  });

  it('handles "year" period', () => {
    const { start, end } = parsePeriodParam('year');
    const now = new Date();
    expect(start.getFullYear()).toBe(now.getFullYear());
    expect(end.getFullYear()).toBe(now.getFullYear() + 1);
  });

  it('handles "quarter" period', () => {
    const { start, end } = parsePeriodParam('quarter');
    const diff = end.getTime() - start.getTime();
    // 3 months in ms — roughly 89–92 days
    expect(diff).toBeGreaterThan(88 * 86400_000);
    expect(diff).toBeLessThan(93 * 86400_000);
  });

  it('defaults to current month when no param', () => {
    const { start, end } = parsePeriodParam();
    const now = new Date();
    expect(start.getMonth()).toBe(now.getMonth());
    expect(end.getMonth()).toBe((now.getMonth() + 1) % 12);
  });
});

describe('formatMonthLabel', () => {
  it('returns a non-empty string for a valid YYYY-MM', () => {
    const label = formatMonthLabel('2026-04');
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });
});
