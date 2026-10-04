import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { FileEventRepository } from "../fileEventRepository";
import { ingestEvent } from "../../services/ingestionService";

function note(details: string) {
  return ingestEvent({
    id: "n1",
    fields: { Event_Type: "Note", Event_UID: "n1", Master_ID: "M1", Event_Date: "2026-01-02", Event_Details: details },
  });
}

describe("recorded-at provenance", () => {
  let dir: string;
  let repo: FileEventRepository;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "prov-"));
    repo = new FileEventRepository(path.join(dir, "events.json"));
  });
  afterEach(() => fs.rm(dir, { recursive: true, force: true }));

  test("stamps recordedAt and the saving role on first save", async () => {
    await repo.save(note("a"), { actorRole: "patient" });
    const stored = await repo.getByUid("n1");
    expect(stored?.recordedByRole).toBe("patient");
    expect(Number.isNaN(Date.parse(stored!.recordedAt!))).toBe(false);
    expect(stored?.lastModifiedAt).toBeUndefined();
  });

  test("a replacement keeps the original recordedAt and records the modification", async () => {
    await repo.save(note("a"), { actorRole: "patient" });
    const first = await repo.getByUid("n1");
    await new Promise((resolve) => setTimeout(resolve, 5));
    await repo.save(note("b"), { actorRole: "administrator" });
    const second = await repo.getByUid("n1");
    expect(second?.recordedAt).toBe(first?.recordedAt);
    expect(second?.recordedByRole).toBe("patient");
    expect(second?.lastModifiedByRole).toBe("administrator");
    expect(Date.parse(second!.lastModifiedAt!)).toBeGreaterThan(Date.parse(first!.recordedAt!));
  });
});
