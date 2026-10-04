import { EventRepository } from "../persistence/eventRepository";
import { batchRequestSchema } from "../schemas/batchSchema";
import { HttpError } from "../utils/httpError";
import { ingestEvent } from "./ingestionService";
import { persistEvent } from "./persistenceService";

export type BatchItemResult =
  | { index: number; status: "created" | "updated"; uid: string }
  | { index: number; status: "failed"; error: string; details?: unknown };

export interface BatchResult {
  summary: { received: number; created: number; updated: number; failed: number };
  results: BatchItemResult[];
}

/**
 * Ingests each record independently: valid records are stored and invalid ones are
 * reported by index, so one bad record never discards the rest. Records run in order,
 * so a repeated uid within a batch replaces the earlier one (reported as "updated").
 */
export async function ingestBatch(
  repository: EventRepository,
  body: unknown,
  options: { masterId?: string; actorRole?: string } = {},
): Promise<BatchResult> {
  const parsed = batchRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(
      400,
      "Invalid batch request: expected { records: [...] }",
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }

  const results: BatchItemResult[] = [];

  for (const [index, record] of parsed.data.records.entries()) {
    try {
      const event = ingestEvent(record, options);
      const { created } = await persistEvent(repository, event, { ownerMasterId: options.masterId, actorRole: options.actorRole });
      results.push({ index, status: created ? "created" : "updated", uid: event.uid });
    } catch (err) {
      if (err instanceof HttpError) {
        results.push({ index, status: "failed", error: err.message, details: err.details });
      } else {
        console.error(err);
        results.push({ index, status: "failed", error: "Storage error" });
      }
    }
  }

  const count = (status: BatchItemResult["status"]) => results.filter((r) => r.status === status).length;
  return {
    summary: {
      received: results.length,
      created: count("created"),
      updated: count("updated"),
      failed: count("failed"),
    },
    results,
  };
}
