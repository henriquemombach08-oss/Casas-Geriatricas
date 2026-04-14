/**
 * Pure helper functions for schedule logic — importable by tests without side effects.
 */

export function calculateWorkedHours(checkedIn: Date, checkedOut: Date): number {
  const diffMs = checkedOut.getTime() - checkedIn.getTime();
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
}

export function isLate(expected: Date, actual: Date, toleranceMinutes = 5): boolean {
  return actual.getTime() > expected.getTime() + toleranceMinutes * 60 * 1000;
}
