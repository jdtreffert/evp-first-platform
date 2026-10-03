import { z } from "zod";
import { isValidDateOnly } from "../validation/fieldValidators";

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 500;

const nonEmpty = z.string().min(1, "must not be empty");
const dateOnly = z.string().refine(isValidDateOnly, { message: "expected a real date in YYYY-MM-DD form" });
const integer = z.string().regex(/^\d+$/, "expected a non-negative integer").transform(Number);

// Strict so a misspelled filter is an error and not silently ignored (which would return everything).
export const eventQuerySchema = z
  .strictObject({
    masterId: nonEmpty.optional(),
    eventType: nonEmpty.optional(),
    from: dateOnly.optional(),
    to: dateOnly.optional(),
    order: z.enum(["asc", "desc"]).default("asc"),
    limit: integer
      .refine((n) => n >= 1 && n <= MAX_LIMIT, { message: `must be between 1 and ${MAX_LIMIT}` })
      .default(DEFAULT_LIMIT),
    offset: integer.default(0),
  })
  .refine((q) => q.from === undefined || q.to === undefined || q.from <= q.to, {
    path: ["from"],
    message: "from must not be after to",
  });
