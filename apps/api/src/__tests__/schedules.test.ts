import { calculateWorkedHours, isLate } from '../lib/schedule-helpers';

describe('calculateWorkedHours', () => {
  it('calculates 6 hours correctly', () => {
    const inAt  = new Date('2026-04-09T07:00:00Z');
    const outAt = new Date('2026-04-09T13:00:00Z');
    expect(calculateWorkedHours(inAt, outAt)).toBe(6);
  });

  it('rounds to 2 decimal places', () => {
    const inAt  = new Date('2026-04-09T07:00:00Z');
    const outAt = new Date('2026-04-09T13:05:00Z');
    // 6h5min = 6.0833... → rounded = 6.08
    expect(calculateWorkedHours(inAt, outAt)).toBe(6.08);
  });

  it('handles overnight shift (12 hours)', () => {
    const inAt  = new Date('2026-04-09T19:00:00Z');
    const outAt = new Date('2026-04-10T07:00:00Z');
    expect(calculateWorkedHours(inAt, outAt)).toBe(12);
  });

  it('returns 0 for same time', () => {
    const t = new Date('2026-04-09T08:00:00Z');
    expect(calculateWorkedHours(t, t)).toBe(0);
  });
});

describe('isLate', () => {
  it('returns false when on time', () => {
    const expected = new Date('2026-04-09T07:00:00Z');
    const actual   = new Date('2026-04-09T07:00:00Z');
    expect(isLate(expected, actual)).toBe(false);
  });

  it('returns false within tolerance (3 min)', () => {
    const expected = new Date('2026-04-09T07:00:00Z');
    const actual   = new Date('2026-04-09T07:03:00Z');
    expect(isLate(expected, actual, 5)).toBe(false);
  });

  it('returns true when late beyond tolerance', () => {
    const expected = new Date('2026-04-09T07:00:00Z');
    const actual   = new Date('2026-04-09T07:06:00Z');
    expect(isLate(expected, actual, 5)).toBe(true);
  });

  it('returns false when early', () => {
    const expected = new Date('2026-04-09T07:00:00Z');
    const actual   = new Date('2026-04-09T06:55:00Z');
    expect(isLate(expected, actual)).toBe(false);
  });

  it('uses default tolerance of 5 minutes', () => {
    const expected = new Date('2026-04-09T07:00:00Z');
    const exactly5 = new Date('2026-04-09T07:05:00Z');
    const over5    = new Date('2026-04-09T07:05:01Z');
    expect(isLate(expected, exactly5)).toBe(false);
    expect(isLate(expected, over5)).toBe(true);
  });
});
