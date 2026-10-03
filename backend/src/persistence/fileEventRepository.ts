import { promises as fs } from "fs";
import path from "path";
import { UnifiedEvent } from "../types/UnifiedEvents";
import { EventQuery, EventQueryResult, applyEventQuery } from "./eventQuery";
import { EventRepository, SaveResult } from "./eventRepository";

interface StoreFile {
  version: 1;
  events: UnifiedEvent[];
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

  save(event: UnifiedEvent): Promise<SaveResult> {
    return this.enqueue(async () => {
      const events = await this.readAll();
      const index = events.findIndex((e) => e.uid === event.uid);
      if (index === -1) {
        events.push(event);
      } else {
        events[index] = event;
      }
      await this.writeAll(events);
      return { created: index === -1 };
    });
  }

  getByUid(uid: string): Promise<UnifiedEvent | null> {
    return this.enqueue(async () => {
      const events = await this.readAll();
      return events.find((e) => e.uid === uid) ?? null;
    });
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
    let text: string;
    try {
      text = await fs.readFile(this.filePath, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
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
    return parsed.events;
  }

  private async writeAll(events: UnifiedEvent[]): Promise<void> {
    const store: StoreFile = { version: 1, events };
    const tempPath = `${this.filePath}.${process.pid}.tmp`;

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(tempPath, JSON.stringify(store, null, 2), "utf8");
    await fs.rename(tempPath, this.filePath);
  }
}
