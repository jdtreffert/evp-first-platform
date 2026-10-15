import { promises as fs } from "fs";
import path from "path";
import { Encounter } from "../types/Encounter";
import {
  EncounterQuery,
  EncounterQueryResult,
  EncounterRepository,
  EncounterSaveOptions,
  EncounterSaveResult,
  EncounterVersion,
  applyEncounterQuery,
  prepareSave,
} from "./encounterRepository";

interface StoreFile {
  version: 1;
  encounters: Encounter[];
  history: EncounterVersion[];
}

function isStoreFile(value: unknown): value is StoreFile {
  const v = value as Partial<StoreFile> | null;
  return (
    typeof v === "object" && v !== null && v.version === 1 && Array.isArray(v.encounters) && Array.isArray(v.history)
  );
}

/**
 * Development storage in a JSON file, written the same way as the event store: operations run through a
 * single queue, writes go to a temp file that is renamed into place, a missing file is an empty store and a
 * corrupt file is an error that is never overwritten. Single-process only.
 */
export class FileEncounterRepository implements EncounterRepository {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  save(encounter: Encounter, options: EncounterSaveOptions = {}): Promise<EncounterSaveResult> {
    return this.enqueue(async () => {
      const store = await this.read();
      const index = store.encounters.findIndex((e) => e.uid === encounter.uid);
      const existing = index === -1 ? undefined : store.encounters[index];
      const { saved, superseded } = prepareSave(existing, encounter, options);

      if (superseded) store.history.push(superseded);
      if (index === -1) store.encounters.push(saved);
      else store.encounters[index] = saved;
      await this.write(store);
      return { created: existing === undefined, encounter: saved };
    });
  }

  getByUid(uid: string): Promise<Encounter | null> {
    return this.enqueue(async () => (await this.read()).encounters.find((e) => e.uid === uid) ?? null);
  }

  history(uid: string): Promise<EncounterVersion[]> {
    return this.enqueue(async () => (await this.read()).history.filter((v) => v.encounter.uid === uid));
  }

  query(query: EncounterQuery): Promise<EncounterQueryResult> {
    return this.enqueue(async () => applyEncounterQuery((await this.read()).encounters, query));
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task);
    // A failed task must not poison the queue for later callers.
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async read(): Promise<StoreFile> {
    let text: string;
    try {
      text = await fs.readFile(this.filePath, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, encounters: [], history: [] };
      throw err;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Encounter store is not valid JSON: ${this.filePath}`);
    }
    if (!isStoreFile(parsed)) {
      throw new Error(`Encounter store has an unrecognized format: ${this.filePath}`);
    }
    return parsed;
  }

  private async write(store: StoreFile): Promise<void> {
    const tempPath = `${this.filePath}.${process.pid}.tmp`;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(tempPath, JSON.stringify(store, null, 2), "utf8");
    await fs.rename(tempPath, this.filePath);
  }
}
