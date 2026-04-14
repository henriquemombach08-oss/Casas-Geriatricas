/**
 * Pure helper functions for financial logic — importable by tests without side effects.
 */

export function shouldMarkOverdue(record: { due_date: Date; status: string }): boolean {
  return (
    record.due_date < new Date() &&
    ['pending', 'partially_paid'].includes(record.status)
  );
}

export function calculatePaymentRate(records: { type: string; status: string }[]): number {
  const charges = records.filter((r) => r.type === 'charge');
  if (charges.length === 0) return 0;
  const paid = charges.filter((r) => r.status === 'paid').length;
  return Math.round((paid / charges.length) * 100);
}
