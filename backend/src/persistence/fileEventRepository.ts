import { promises as fs } from "fs";
import path from "path";
import { UnifiedEvent } from "../types/UnifiedEvents";
import { EventQuery, EventQueryResult, applyEventQuery } from "./eventQuery";
import { EventRepository, EventVersion, SaveOptions, SaveResult } from "./eventRepository";
import { HttpError } from "../utils/httpError";

interface StoreFile {
  version: 1;
  events: UnifiedEvent[];
  /** Superseded versions; absent in stores written before editing was supported. */
  history?: EventVersion[];
}

function isStoreFile(value: unknown): value is StoreFile {
  const v = value as Partial<StoreFile> | null;
  return typeof v === "object" && v !== null && v.version === 1 && Array.isArray(v.events);
}

/**
 * JSON-file repository. All operations run through a single queue so concurrent
 * requests cannot interleave read-modify-write cycles, and writes go to a temp
 * file that is renamed into place so a crash never leaves a truncated store.
 * A missing file is an empty store; a corrupt file is an error and is never overwritten.
 */
export class FileEventRepository implements EventRepository {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  save(event: UnifiedEvent, options: SaveOptions = {}): Promise<SaveResult> {
    return this.enqueue(async () => {
      const store = await this.readStore();
      const events = store.events;
      const history = store.history ?? [];
      const index = events.findIndex((e) => e.uid === event.uid);
      if (options.ownerMasterId !== undefined) {
        if (event.masterId !== options.ownerMasterId) {
          throw new HttpError(403, "Patients may only write events for their own patient record");
        }
        if (index !== -1 && events[index].masterId !== options.ownerMasterId) {
          throw new HttpError(403, "Patients may not replace another patient's event");
        }
      }
      // Provenance is stamped here, never taken from the client: recordedAt is when the event
      // first entered the repository and is kept across replacements.
      const now = new Date().toISOString();
      const role = options.actorRole ?? "system";
      if (index === -1) {
        event.recordedAt = now;
        event.recordedByRole = role;
        events.push(event);
      } else {
        const original = events[index];
        history.push({ event: original, supersededAt: now, supersededByRole: role });
        event.recordedAt = original.recordedAt ?? now;
        event.recordedByRole = original.recordedByRole ?? role;
        event.lastModifiedAt = now;
        event.lastModifiedByRole = role;
        events[index] = event;
      }
      await this.writeStore({ version: 1, events, history });
      return { created: index === -1 };
    });
  }

  getByUid(uid: string): Promise<UnifiedEvent | null> {
    return this.enqueue(async () => {
      const events = await this.readAll();
      return events.find((e) => e.uid === uid) ?? null;
    });
  }

  history(uid: string): Promise<EventVersion[]> {
    return this.enqueue(async () => ((await this.readStore()).history ?? []).filter((v) => v.event.uid === uid));
  }

  list(): Promise<UnifiedEvent[]> {
    return this.enqueue(() => this.readAll());
  }

  query(query: EventQuery): Promise<EventQueryResult> {
    return this.enqueue(async () => applyEventQuery(await this.readAll(), query));
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task);
    // A failed task must not poison the queue for later callers.
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async readAll(): Promise<UnifiedEvent[]> {
    return (await this.readStore()).events;
  }

  private async readStore(): Promise<StoreFile> {
    let text: string;
    try {
      text = await fs.readFile(this.filePath, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, events: [] };
      throw err;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Event store is not valid JSON: ${this.filePath}`);
    }
    if (!isStoreFile(parsed)) {
      throw new Error(`Event store has an unrecognized format: ${this.filePath}`);
    }
    return parsed;
  }

  private async writeStore(store: StoreFile): Promise<void> {
    const tempPath = `${this.filePath}.${process.pid}.tmp`;

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(tempPath, JSON.stringify(store, null, 2), "utf8");
    await fs.rename(tempPath, this.filePath);
  }
}
