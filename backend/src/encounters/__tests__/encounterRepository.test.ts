import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { Encounter } from "../../types/Encounter";
import { EncounterRepository } from "../encounterRepository";
import { FileEncounterRepository } from "../fileEncounterRepository";
import { InMemoryEncounterRepository } from "../inMemoryEncounterRepository";

function encounter(uid: string, masterId = "M1", encounterDate = "2026-03-04", summary = "a"): Encounter {
  return { uid, masterId, encounterDate, encounterSummary: summary, payload: { id: uid, fields: {} } };
}

interface Fixture {
  repo: EncounterRepository;
  cleanup: () => Promise<unknown>;
}

const fixtures: [string, () => Promise<Fixture>][] = [
  ["file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "evp-enc-"));
    return { repo: new FileEncounterRepository(path.join(dir, "encounters.json")), cleanup: () => fs.rm(dir, { recursive: true, force: true }) };
  }],
  ["in-memory", async () => ({ repo: new InMemoryEncounterRepository(), cleanup: async () => undefined })],
];

describe.each(fixtures)("%s encounter repository", (_name, create) => {
  let repo: EncounterRepository;
  let cleanup: () => Promise<unknown>;

  beforeEach(async () => {
    ({ repo, cleanup } = await create());
  });
  afterEach(() => cleanup());

  test("stamps recorded-at and the saving role on first save", async () => {
    const { created, encounter: stored } = await repo.save(encounter("e1"), { actorRole: "patient" });

    expect(created).toBe(true);
    expect(stored.recordedByRole).toBe("patient");
    expect(Number.isNaN(Date.parse(stored.recordedAt!))).toBe(false);
    expect(stored.lastModifiedAt).toBeUndefined();
    expect(await repo.getByUid("e1")).toEqual(stored);
  });

  test("a replacement keeps the original recorded-at, records the modification and keeps the old version", async () => {
    const first = (await repo.save(encounter("e1", "M1", "2026-03-04", "first"), { actorRole: "patient" })).encounter;
    await new Promise((resolve) => setTimeout(resolve, 5));
    const { created, encounter: second } = await repo.save(encounter("e1", "M1", "2026-03-05", "second"), { actorRole: "administrator" });

    expect(created).toBe(false);
    expect(second.recordedAt).toBe(first.recordedAt);
    expect(second.recordedByRole).toBe("patient");
    expect(second.lastModifiedByRole).toBe("administrator");
    expect(second.encounterSummary).toBe("second");

    const versions = await repo.history("e1");
    expect(versions).toHaveLength(1);
    expect(versions[0].encounter.encounterSummary).toBe("first");
    expect(versions[0].supersededByRole).toBe("administrator");
  });

  test("history is empty for a new encounter and unknown uid", async () => {
    await repo.save(encounter("e1"));
    expect(await repo.history("e1")).toEqual([]);
    expect(await repo.history("nope")).toEqual([]);
    expect(await repo.getByUid("nope")).toBeNull();
  });

  test("a patient can only write their own record and cannot replace another patient's encounter", async () => {
    await repo.save(encounter("theirs", "M2"));

    await expect(repo.save(encounter("mine", "M2"), { ownerMasterId: "M1" })).rejects.toMatchObject({ status: 403 });
    await expect(repo.save(encounter("theirs", "M1"), { ownerMasterId: "M1" })).rejects.toMatchObject({ status: 403 });
    expect((await repo.save(encounter("mine", "M1"), { ownerMasterId: "M1" })).created).toBe(true);
  });

  test("nobody can move an encounter to another patient", async () => {
    await repo.save(encounter("e1", "M1"));
    await expect(repo.save(encounter("e1", "M2"))).rejects.toMatchObject({ status: 422 });
    expect((await repo.getByUid("e1"))?.masterId).toBe("M1");
  });

  test("queries by patient, newest first by default order, with paging", async () => {
    await repo.save(encounter("a", "M1", "2026-01-10"));
    await repo.save(encounter("b", "M1", "2026-03-10"));
    await repo.save(encounter("c", "M2", "2026-02-10"));
    await repo.save(encounter("d", "M1", "2026-02-10"));

    const desc = await repo.query({ masterId: "M1", order: "desc", limit: 100, offset: 0 });
    expect(desc.encounters.map((e) => e.uid)).toEqual(["b", "d", "a"]);
    expect(desc.total).toBe(3);

    const asc = await repo.query({ masterId: "M1", order: "asc", limit: 2, offset: 1 });
    expect(asc.encounters.map((e) => e.uid)).toEqual(["d", "b"]);
    expect(asc.total).toBe(3);

    expect((await repo.query({ order: "asc", limit: 100, offset: 0 })).total).toBe(4);
  });
});

test("a corrupt encounter file is an error and is never overwritten", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "evp-enc-"));
  const file = path.join(dir, "encounters.json");
  await fs.writeFile(file, "not json");
  const repo = new FileEncounterRepository(file);

  await expect(repo.save(encounter("e1"))).rejects.toThrow("not valid JSON");
  expect(await fs.readFile(file, "utf8")).toBe("not json");
  await fs.rm(dir, { recursive: true, force: true });
});
