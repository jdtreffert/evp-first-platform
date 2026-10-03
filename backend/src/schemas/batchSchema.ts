import { z } from "zod";

export const MAX_BATCH_SIZE = 500;

// Records are validated one by one by the ingestion pipeline so a bad record cannot reject the batch.
export const batchRequestSchema = z.strictObject({
  records: z.array(z.unknown()).min(1, "records must not be empty").max(MAX_BATCH_SIZE, `at most ${MAX_BATCH_SIZE} records per batch`),
});
