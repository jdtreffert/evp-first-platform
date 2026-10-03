import { InMemoryEventRepository } from "../../persistence/__tests__/inMemoryEventRepository";
import { MAX_BATCH_SIZE } from "../../schemas/batchSchema";
import { HttpError } from "../../utils/httpError";
import { ingestBatch } from "../batchIngestionService";

const note = (uid: string, extra: Record<string, unknown> = {}) => ({
  id: uid,
  fields: { Event_Type: "Note", Event_UID: uid, Master_ID: "M1", ...extra },
});

describe("ingestBatch", () => {
  test("stores every valid record", async () => {
    const repo = new InMemoryEventRepository();
    const result = await ingestBatch(repo, { records: [note("A"), note("B")] });

    expect(result.summary).toEqual({ received: 2, created: 2, updated: 0, failed: 0 });
    expect(result.results).toEqual([
      { index: 0, status: "created", uid: "A" },
      { index: 1, status: "created", uid: "B" },
    ]);
    expect(repo.events.size).toBe(2);
  });

  test("saves valid records and reports each failure by index", async () => {
    const repo = new InMemoryEventRepository();
    const result = await ingestBatch(repo, {
      records: [
        note("A"),
        note("B", { Event_Date: "2024-02-30" }),
        { id: "x" },
        note("C", { Event_Type: "Nope" }),
        "junk",
        { id: "t", fields: { Event_Type: "Treatment", Master_ID: "M1" } },
        note("D"),
      ],
    });

    expect(result.summary).toEqual({ received: 7, created: 2, updated: 0, failed: 5 });
    expect([...repo.events.keys()]).toEqual(["A", "D"]);
    expect(result.results.map((r) => [r.index, r.status])).toEqual([
      [0, "created"], [1, "failed"], [2, "failed"], [3, "failed"], [4, "failed"], [5, "failed"], [6, "created"],
    ]);
    expect(result.results[1]).toMatchObject({ error: "Normalized event failed validation", details: [expect.objectContaining({ path: "eventDate" })] });
    expect(result.results[5]).toMatchObject({ error: expect.stringContaining("Unknown Treatment subtype") });
  });

  test("re-sending a batch updates instead of duplicating", async () => {
    const repo = new InMemoryEventRepository();
    await ingestBatch(repo, { records: [note("A")] });
    const result = await ingestBatch(repo, { records: [note("A"), note("B")] });

    expect(result.summary).toMatchObject({ created: 1, updated: 1 });
    expect(repo.events.size).toBe(2);
  });

  test("a repeated uid within one batch is stored once, last wins", async () => {
    const repo = new InMemoryEventRepository();
    const result = await ingestBatch(repo, { records: [note("A", { Note_Text: "first" }), note("A", { Note_Text: "second" })] });

    expect(result.results.map((r) => r.status)).toEqual(["created", "updated"]);
    expect(repo.events.get("A")?.noteText).toBe("second");
  });

  test("a storage failure fails only that record, without leaking details", async () => {
    const repo = new InMemoryEventRepository();
    const save = repo.save.bind(repo);
    repo.save = (event) => (event.uid === "B" ? Promise.reject(new Error("/secret/path")) : save(event));
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await ingestBatch(repo, { records: [note("A"), note("B"), note("C")] });

    expect(result.results[1]).toEqual({ index: 1, status: "failed", error: "Storage error" });
    expect(result.summary).toMatchObject({ created: 2, failed: 1 });
    spy.mockRestore();
  });

  test.each([
    [null],
    [{}],
    [{ records: "x" }],
    [{ records: [] }],
    [{ records: [note("A")], extra: 1 }],
    [{ records: Array.from({ length: MAX_BATCH_SIZE + 1 }, (_, i) => note(`E${i}`)) }],
  ])("rejects an invalid request body with 400 and stores nothing", async (body) => {
    const repo = new InMemoryEventRepository();

    await expect(ingestBatch(repo, body)).rejects.toMatchObject({ status: 400 });
    await expect(ingestBatch(repo, body)).rejects.toBeInstanceOf(HttpError);
    expect(repo.events.size).toBe(0);
  });

  test("accepts exactly the maximum batch size", async () => {
    const repo = new InMemoryEventRepository();
    const records = Array.from({ length: MAX_BATCH_SIZE }, (_, i) => note(`E${i}`));

    expect((await ingestBatch(repo, { records })).summary.created).toBe(MAX_BATCH_SIZE);
  });
});
