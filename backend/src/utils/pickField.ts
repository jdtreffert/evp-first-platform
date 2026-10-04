/** Returns the first present value among the given field names (schema name first, then legacy aliases). */
export function pickField(fields: Record<string, any>, ...names: string[]): any {
  for (const name of names) {
    const value = fields[name];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}
