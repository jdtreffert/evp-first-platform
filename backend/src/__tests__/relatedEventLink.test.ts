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

  test("a Recurrence or Progression links to the imaging it was recognised from", async () => {
    const repository = new InMemoryEventRepository();
    await persistEvent(
      repository,
      ingestEvent({ id: "I1", fields: { Event_Type: "Imaging", Event_UID: "I1", Master_ID: "M1", Event_Date: "2027-03-01", Imaging_Modality: "CT" } }),
    );
    for (const type of ["Recurrence", "Progression"]) {
      const uid = `${type}-1`;
      await persistEvent(
        repository,
        ingestEvent({
          id: uid,
          fields: {
            Event_Type: type, Event_UID: uid, Master_ID: "M1", Event_Date: "2027-03-10",
            Event_Related_UID: "I1", Event_Relationship: "Derived_From",
          },
        }),
      );
      expect(await repository.getByUid(uid)).toMatchObject({ eventType: type, relatedEventUid: "I1", eventRelationship: "Derived_From" });
    }
  });

  test("rejects a missing event or another patient's event", async () => {
    const repository = new InMemoryEventRepository();
    await persistEvent(repository, turbt("T2", "M2"));

    await expect(persistEvent(repository, pathology("P2", "M1", "nope"))).rejects.toBeInstanceOf(HttpError);
    await expect(persistEvent(repository, pathology("P3", "M1", "T2"))).rejects.toMatchObject({ status: 422 });
  });
});

describe("self-links", () => {
  test("an event cannot be related to itself", async () => {
    const repository = new InMemoryEventRepository();
    await persistEvent(repository, turbt("T9", "M1"));
    const self = ingestEvent({
      id: "T9",
      fields: { Event_Type: "TURBT", Event_UID: "T9", Master_ID: "M1", Event_Date: "2026-09-01", Event_Related_UID: "T9", Event_Relationship: "Related_To" },
    });
    await expect(persistEvent(repository, self)).rejects.toMatchObject({ status: 422 });
  });
});
