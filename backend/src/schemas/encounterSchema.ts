import { z } from "zod";
import { isValidEventDate, isValidUid } from "../validation/fieldValidators";
import { rawEventRecordSchema } from "./rawEventRecordSchema";

const text = z.string().nullable().optional();

// Strict so that fields missing from the schema are reported rather than silently accepted.
export const encounterSchema = z.strictObject({
  uid: z.string().refine(isValidUid, {
    message: "Invalid uid: use 1-128 letters, digits, '_', '.', ':' or '-'",
  }),
  masterId: z.string().min(1, "masterId is required"),
  encounterDate: z
    .string({ error: "Encounter_Date is required" })
    .refine(isValidEventDate, { message: "Invalid date: expected a real YYYY-MM-DD or ISO 8601 date-time" }),
  encounterType: text,
  encounterSummary: text,
  payload: rawEventRecordSchema,
  recordedAt: z.string().optional(),
  recordedByRole: z.string().optional(),
  lastModifiedAt: z.string().optional(),
  lastModifiedByRole: z.string().optional(),
});
