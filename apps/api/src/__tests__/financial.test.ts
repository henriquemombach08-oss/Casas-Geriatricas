import { shouldMarkOverdue, calculatePaymentRate } from '../lib/financial-helpers';

describe('shouldMarkOverdue', () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  it('marks as overdue when past due date and status is pending', () => {
    expect(shouldMarkOverdue({ due_date: yesterday, status: 'pending' })).toBe(true);
  });

  it('marks as overdue when past due date and status is partially_paid', () => {
    expect(shouldMarkOverdue({ due_date: yesterday, status: 'partially_paid' })).toBe(true);
  });

  it('does NOT mark overdue when due date is in the future', () => {
    expect(shouldMarkOverdue({ due_date: tomorrow, status: 'pending' })).toBe(false);
  });

  it('does NOT mark overdue when already paid', () => {
    expect(shouldMarkOverdue({ due_date: yesterday, status: 'paid' })).toBe(false);
  });

  it('does NOT mark overdue when canceled', () => {
    expect(shouldMarkOverdue({ due_date: yesterday, status: 'canceled' })).toBe(false);
  });
});

describe('calculatePaymentRate', () => {
  it('returns 0 when no charges', () => {
    expect(calculatePaymentRate([])).toBe(0);
  });

  it('returns 0 when no charges (only payments)', () => {
    const records = [
      { type: 'payment', status: 'paid' },
      { type: 'payment', status: 'paid' },
    ];
    expect(calculatePaymentRate(records)).toBe(0);
  });

  it('returns 100 when all charges are paid', () => {
    const records = [
      { type: 'charge', status: 'paid' },
      { type: 'charge', status: 'paid' },
    ];
    expect(calculatePaymentRate(records)).toBe(100);
  });

  it('returns 50 when half of charges are paid', () => {
    const records = [
      { type: 'charge', status: 'paid' },
      { type: 'charge', status: 'pending' },
    ];
    expect(calculatePaymentRate(records)).toBe(50);
  });

  it('ignores non-charge records in calculation', () => {
    const records = [
      { type: 'charge',  status: 'paid' },
      { type: 'charge',  status: 'overdue' },
      { type: 'payment', status: 'paid' },  // should not count
      { type: 'refund',  status: 'paid' },  // should not count
    ];
    // 1 paid out of 2 charges = 50%
    expect(calculatePaymentRate(records)).toBe(50);
  });

  it('rounds to nearest integer', () => {
    const records = [
      { type: 'charge', status: 'paid' },
      { type: 'charge', status: 'paid' },
      { type: 'charge', status: 'pending' },
    ];
    // 2/3 = 66.67% → rounds to 67
    expect(calculatePaymentRate(records)).toBe(67);
  });
});
