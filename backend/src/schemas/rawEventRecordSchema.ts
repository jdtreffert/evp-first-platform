import { z } from "zod";

export const rawEventRecordSchema = z.object({
  id: z.string().min(1),
  fields: z.record(z.string(), z.any()),
});
