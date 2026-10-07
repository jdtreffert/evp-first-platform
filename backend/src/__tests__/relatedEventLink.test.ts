import { InMemoryEventRepository } from "../persistence/__tests__/inMemoryEventRepository";
import { ingestEvent } from "../services/ingestionService";
import { persistEvent } from "../services/persistenceService";
import { HttpError } from "../utils/httpError";

const turbt = (uid: string, master: string) =>
  ingestEvent({ id: uid, fields: { Event_Type: "TURBT", Event_UID: uid, Master_ID: master, Event_Date: "2026-09-01", TURBT_Completeness: "Complete" } });

const pathology = (uid: string, master: string, related: string) =>
  ingestEvent({
    id: uid,
    fields: {
      Event_Type: "Pathology", Event_UID: uid, Master_ID: master, Event_Date: "2026-09-08", Pathology_Depth: "T1",
      Event_Related_UID: related, Event_Relationship: "Derived_From",
    },
  });

describe("Event_Related_UID", () => {
  test("links to an existing event for the same patient", async () => {
    const repository = new InMemoryEventRepository();
    await persistEvent(repository, turbt("T1", "M1"));

    await persistEvent(repository, pathology("P1", "M1", "T1"));
    expect((await repository.getByUid("P1"))?.relatedEventUid).toBe("T1");
  });

  test("rejects a missing event or another patient's event", async () => {
    const repository = new InMemoryEventRepository();
    await persistEvent(repository, turbt("T2", "M2"));

    await expect(persistEvent(repository, pathology("P2", "M1", "nope"))).rejects.toBeInstanceOf(HttpError);
    await expect(persistEvent(repository, pathology("P3", "M1", "T2"))).rejects.toMatchObject({ status: 422 });
  });
});
