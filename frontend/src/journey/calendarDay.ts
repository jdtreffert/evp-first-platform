/**
 * The calendar date of a recorded date or date-time (any time of day or offset is ignored), or an empty
 * string when the value is absent or not in YYYY-MM-DD form.
 */
export function calendarDay(date: string | null | undefined): string {
  const day = date?.slice(0, 10) ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "";
}

/** The number of whole days from one YYYY-MM-DD date to another (negative when the second is earlier). */
export function daysBetween(from: string, to: string): number {
  const [fromYear, fromMonth, fromDate] = from.split("-").map(Number);
  const [toYear, toMonth, toDate] = to.split("-").map(Number);
  return Math.round((Date.UTC(toYear, toMonth - 1, toDate) - Date.UTC(fromYear, fromMonth - 1, fromDate)) / 86_400_000);
}

/** Today's date in the given date's local time zone, as YYYY-MM-DD. The date is a parameter so tests can fix it. */
export function todayLocal(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The whole years, months and days from one YYYY-MM-DD date to a later one, counting calendar months (a month
 * is complete when the same day of the next month is reached, or the month's last day when it has no such day).
 * Returns null when the second date is earlier than the first.
 */
export function calendarDifference(from: string, to: string): { years: number; months: number; days: number } | null {
  if (daysBetween(from, to) < 0) return null;
  const [fromYear, fromMonth, fromDate] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);

  let totalMonths = (toYear - fromYear) * 12 + (toMonth - fromMonth);
  const landing = (months: number) => {
    const index = fromMonth - 1 + months;
    const year = fromYear + Math.floor(index / 12);
    const month = (((index % 12) + 12) % 12) + 1;
    const date = Math.min(fromDate, daysInMonth(year, month));
    return `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
  };
  if (daysBetween(landing(totalMonths), to) < 0) totalMonths -= 1;
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12, days: daysBetween(landing(totalMonths), to) };
}

const unit = (count: number, name: string) => `${count} ${name}${count === 1 ? "" : "s"}`;

/**
 * Elapsed time between two dates in words: "12 days", "6 months, 7 days (189 days)", "1 year, 2 months (426 days)".
 * The total in days is added whenever months or years are shown. Null when the second date is earlier.
 */
export function describeElapsed(from: string, to: string): string | null {
  const difference = calendarDifference(from, to);
  if (!difference) return null;
  const parts = [
    difference.years > 0 ? unit(difference.years, "year") : null,
    difference.months > 0 ? unit(difference.months, "month") : null,
    difference.days > 0 || (difference.years === 0 && difference.months === 0) ? unit(difference.days, "day") : null,
  ].filter(Boolean);
  const total = daysBetween(from, to);
  return difference.years > 0 || difference.months > 0 ? `${parts.join(", ")} (${unit(total, "day")})` : parts.join(", ");
}
