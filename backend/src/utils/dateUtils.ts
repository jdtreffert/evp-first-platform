export const dateUtils = {
  nowISO: () => new Date().toISOString(),
};

/**
 * Normalizes a date into YYYY-MM-DD format (ISO date without time).
 * This matches what all normalizers expect.
 */
export function normalizeDate(date: string | Date): string {
  return new Date(date).toISOString().split("T")[0];
}
