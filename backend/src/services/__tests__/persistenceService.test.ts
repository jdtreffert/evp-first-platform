import { InMemoryEventRepository } from "../../persistence/__tests__/inMemoryEventRepository";
import { UnifiedEvent } from "../../types/UnifiedEvents";
import { persistEvent } from "../persistenceService";

const event: UnifiedEvent = {
  uid: "E1",
  masterId: "M1",
  eventType: "Note",
  eventDate: null,
  payload: { id: "r", fields: {} },
};

describe("persistEvent", () => {
  test("stores the event and reports whether it was created", async () => {
    const repo = new InMemoryEventRepository();

    expect(await persistEvent(repo, event)).toEqual({ created: true });
    expect(await persistEvent(repo, event)).toEqual({ created: false });
    expect(repo.events.size).toBe(1);
  });
});
