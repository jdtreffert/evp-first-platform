import { InMemoryEventRepository } from "../../persistence/__tests__/inMemoryEventRepository";
import { UnifiedEvent } from "../../types/UnifiedEvents";
import { HttpError } from "../../utils/httpError";
import { getEventByUid, queryEvents } from "../queryService";

const ev = (uid: string, masterId: string): UnifiedEvent => ({
  uid,
  masterId,
  eventType: "Note",
  eventDate: "2024-01-01",
  payload: { id: uid, fields: {} },
});

async function seeded() {
  const repo = new InMemoryEventRepository();
  await repo.save(ev("E1", "M1"));
  await repo.save(ev("E2", "M2"));
  return repo;
}

describe("queryEvents", () => {
  test("filters through the repository", async () => {
    const result = await queryEvents(await seeded(), { masterId: "M2" });
    expect(result.events.map((e) => e.uid)).toEqual(["E2"]);
  });

  test("invalid parameters throw a 400 with details before touching storage", () => {
    const repo = new InMemoryEventRepository();
    const spy = jest.spyOn(repo, "query");

    try {
      queryEvents(repo, { limit: "0", bogus: "1" });
      throw new Error("expected failure");
    } catch (e) {
      expect(e).toBeInstanceOf(HttpError);
      expect((e as HttpError).status).toBe(400);
      expect((e as HttpError).details).toEqual(expect.arrayContaining([expect.objectContaining({ path: "limit" })]));
    }
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("getEventByUid", () => {
  test("returns the stored event", async () => {
    expect((await getEventByUid(await seeded(), "E1")).uid).toBe("E1");
  });

  test("404 when not found", async () => {
    await expect(getEventByUid(await seeded(), "nope")).rejects.toMatchObject({ status: 404 });
  });

  test("400 for a malformed uid, without querying storage", async () => {
    const repo = new InMemoryEventRepository();
    const spy = jest.spyOn(repo, "getByUid");
    await expect(getEventByUid(repo, "bad uid")).rejects.toMatchObject({ status: 400 });
    expect(spy).not.toHaveBeenCalled();
  });
});
