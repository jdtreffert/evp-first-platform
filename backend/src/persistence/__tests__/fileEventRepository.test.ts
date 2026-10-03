import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { UnifiedEvent } from "../../types/UnifiedEvents";
import { FileEventRepository } from "../fileEventRepository";

const event = (uid: string, extra: Partial<UnifiedEvent> = {}): UnifiedEvent => ({
  uid,
  masterId: "M1",
  eventType: "Note",
  eventDate: "2024-01-01",
  payload: { id: `rec-${uid}`, fields: {} },
  ...extra,
});

describe("FileEventRepository", () => {
  let dir: string;
  let file: string;
  let repo: FileEventRepository;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "evp-repo-"));
    file = path.join(dir, "nested", "events.json");
    repo = new FileEventRepository(file);
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("a missing file is an empty store", async () => {
    expect(await repo.list()).toEqual([]);
    expect(await repo.getByUid("E1")).toBeNull();
  });

  test("saves, creating parent directories, and reads back", async () => {
    expect(await repo.save(event("E1"))).toEqual({ created: true });

    expect(await repo.getByUid("E1")).toEqual(event("E1"));
    expect(await repo.list()).toEqual([event("E1")]);
  });

  test("saving an existing uid replaces it without duplicating", async () => {
    await repo.save(event("E1", { eventSummary: "old" }));
    expect(await repo.save(event("E1", { eventSummary: "new" }))).toEqual({ created: false });

    const all = await repo.list();
    expect(all).toHaveLength(1);
    expect(all[0].eventSummary).toBe("new");
  });

  test("preserves zero values and nulls through a round trip", async () => {
    await repo.save(event("E1", { ctDNAValue: 0, qolPain: null }));
    expect(await repo.getByUid("E1")).toMatchObject({ ctDNAValue: 0, qolPain: null });
  });

  test("persists across repository instances", async () => {
    await repo.save(event("E1"));
    expect(await new FileEventRepository(file).list()).toHaveLength(1);
  });

  test("concurrent saves are all retained", async () => {
    await Promise.all(Array.from({ length: 25 }, (_, i) => repo.save(event(`E${i}`))));

    const uids = (await repo.list()).map((e) => e.uid).sort();
    expect(uids).toEqual(Array.from({ length: 25 }, (_, i) => `E${i}`).sort());
  });

  test("leaves no temp files behind", async () => {
    await repo.save(event("E1"));
    expect(await fs.readdir(path.dirname(file))).toEqual(["events.json"]);
  });

  test("a corrupt file is an error and is not overwritten", async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, "{not json", "utf8");

    await expect(repo.save(event("E1"))).rejects.toThrow("not valid JSON");
    expect(await fs.readFile(file, "utf8")).toBe("{not json");
  });

  test("an unrecognized format is an error", async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify({ version: 2, events: [] }), "utf8");

    await expect(repo.list()).rejects.toThrow("unrecognized format");
  });

  test("a failed operation does not block later ones", async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, "{not json", "utf8");
    await expect(repo.list()).rejects.toThrow();

    await fs.writeFile(file, JSON.stringify({ version: 1, events: [] }), "utf8");
    await expect(repo.save(event("E1"))).resolves.toEqual({ created: true });
  });

  test("query filters and paginates the stored events", async () => {
    await repo.save(event("E1", { eventDate: "2024-01-01" }));
    await repo.save(event("E2", { eventDate: "2024-02-01", masterId: "M2" }));
    await repo.save(event("E3", { eventDate: "2024-03-01" }));

    const result = await repo.query({ masterId: "M1", order: "desc", limit: 1, offset: 0 });

    expect(result.total).toBe(2);
    expect(result.events.map((e) => e.uid)).toEqual(["E3"]);
  });
});
