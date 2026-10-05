import { eventFieldCatalog } from "../schemas/eventFieldCatalog";

export interface FieldIssue {
  path: string;
  message: string;
}

/** Event_Type is checked against the normalizer registry, which also holds platform-only types. */
const skippedFields = new Set(["Event_Type"]);

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/**
 * Checks raw field values against the schema catalog: select fields must use one of the
 * defined options and number fields must be finite numbers. Unknown fields are not checked.
 */
export function validateFieldValues(fields: Record<string, unknown>): FieldIssue[] {
  const issues: FieldIssue[] = [];

  for (const [name, value] of Object.entries(fields)) {
    const definition = Object.prototype.hasOwnProperty.call(eventFieldCatalog, name)
      ? eventFieldCatalog[name]
      : undefined;
    if (!definition || skippedFields.has(name) || isBlank(value)) continue;

    if (definition.kind === "single") {
      if (typeof value !== "string" || !definition.options?.includes(value)) {
        issues.push({ path: `fields.${name}`, message: `Not an allowed option: ${JSON.stringify(value)}` });
      }
    } else if (definition.kind === "multi") {
      const values = Array.isArray(value) ? value : [value];
      for (const item of values) {
        if (typeof item !== "string" || !definition.options?.includes(item)) {
          issues.push({ path: `fields.${name}`, message: `Not an allowed option: ${JSON.stringify(item)}` });
        }
      }
    } else if (definition.kind === "attachment") {
      // Attachments are document ids, held as a list of strings.
      if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item === "")) {
        issues.push({ path: `fields.${name}`, message: "Expected a list of document ids" });
      }
    } else if (definition.kind === "number") {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        issues.push({ path: `fields.${name}`, message: "Expected a number" });
      }
    }
  }

  return issues;
}
