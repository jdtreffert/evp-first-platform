import { requiredEventTypeFields } from "../schemas/eventTypeFields";
import type { FieldIssue } from "./fieldOptions";

function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  return Array.isArray(value) && value.length === 0;
}

/**
 * The fields the event type requires that are missing or blank in the raw record. Types with no required
 * fields, including every type that existed before this rule, always return an empty list. `pathPrefix` is
 * where the field sits in the object being reported on.
 */
export function missingRequiredFields(
  eventType: string,
  fields: Record<string, unknown>,
  pathPrefix = "fields",
): FieldIssue[] {
  const required = Object.prototype.hasOwnProperty.call(requiredEventTypeFields, eventType)
    ? requiredEventTypeFields[eventType]
    : [];
  return required
    .filter((name) => isBlank(fields[name]))
    .map((name) => ({ path: `${pathPrefix}.${name}`, message: `Required for ${eventType} events` }));
}
