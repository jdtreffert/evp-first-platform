import { unifiedEventSchema } from "../schemas/unifiedEventSchema";
import { UnifiedEvent } from "../types/UnifiedEvents";
import { missingRequiredFields } from "../validation/requiredFields";

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult =
  | { valid: true; errors: [] }
  | { valid: false; errors: ValidationIssue[] };

export function validateEvent(input: unknown): ValidationResult {
  const parsed = unifiedEventSchema.safeParse(input);
  if (parsed.success) {
    // Compile-time check that the schema output stays assignable to UnifiedEvent.
    const event: UnifiedEvent = parsed.data;
    const missing = missingRequiredFields(event.eventType, event.payload.fields, "payload.fields");
    if (missing.length > 0) return { valid: false, errors: missing };
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}
