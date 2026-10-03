const UID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/;

export function isValidUid(value: string): boolean {
  return UID_PATTERN.test(value);
}

function isRealCalendarDate(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
  );
}

/** Accepts YYYY-MM-DD or an ISO 8601 date-time with offset, rejecting impossible dates. */
export function isValidEventDate(value: string): boolean {
  const match = DATE_ONLY.exec(value) ?? DATE_TIME.exec(value);
  if (!match) return false;
  return isRealCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** Accepts only a real calendar date in YYYY-MM-DD form (no time component). */
export function isValidDateOnly(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  return match !== null && isRealCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
}
