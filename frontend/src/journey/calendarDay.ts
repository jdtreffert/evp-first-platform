/**
 * The calendar date of a recorded date or date-time (any time of day or offset is ignored), or an empty
 * string when the value is absent or not in YYYY-MM-DD form.
 */
export function calendarDay(date: string | null | undefined): string {
  const day = date?.slice(0, 10) ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "";
}
