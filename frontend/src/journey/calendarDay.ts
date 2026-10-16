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
