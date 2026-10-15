import { z } from "zod";
import { MAX_LIMIT } from "./eventQuerySchema";

const integer = z.string().regex(/^\d+$/, "expected a non-negative integer").transform(Number);

export const DEFAULT_ENCOUNTER_LIMIT = 100;

// Strict so a misspelled filter is an error and not silently ignored (which would return everything).
export const encounterQuerySchema = z.strictObject({
  masterId: z.string().min(1, "must not be empty").optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  limit: integer
    .refine((n) => n >= 1 && n <= MAX_LIMIT, { message: `must be between 1 and ${MAX_LIMIT}` })
    .default(DEFAULT_ENCOUNTER_LIMIT),
  offset: integer.default(0),
});
