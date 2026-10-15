import { describe, expect, it } from "vitest";
import type { UnifiedEvent } from "../../../../../backend/src/types/UnifiedEvents";
import { getLocalDate, shiftDate } from "../dates";
import {
  NEARBY_DAYS,
  candidateWindow,
  checklistEvents,
  eventDay,
  eventLabel,
  membershipChanges,
  unlinked,
  withEncounterLink,
} from "../encounterMembership";

function event(uid: string, eventType: string, eventDate: string | null, extra: Partial<UnifiedEvent> = {}): UnifiedEvent {
  return { uid, masterId: "M1", eventType, eventDate, payload: { id: uid, fields: { Event_UID: uid } }, ...extra };
}

const uids = (events: UnifiedEvent[]) => events.map((e) => e.uid);

describe("dates", () => {
  it("shifts a calendar date across month and year boundaries", () => {
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDate("2024-03-01", -1)).toBe("2024-02-29");
    expect(shiftDate("2026-03-10", 0)).toBe("2026-03-10");
  });

  it("formats today as YYYY-MM-DD", () => {
    expect(getLocalDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("eventLabel and eventDay", () => {
  it("shows the date, type and summary", () => {
    const e = event("a", "Treatment_Delivery", "2026-03-04T10:00:00Z", { eventSummary: "Treatment delivery: Cisplatin" });
    expect(eventDay(e)).toBe("2026-03-04");
    expect(eventLabel(e)).toBe("2026-03-04 · Treatment Delivery · Treatment delivery: Cisplatin");
  });

  it("says so when an event has no date", () => {
    expect(eventDay(event("a", "Note", null))).toBe("");
    expect(eventLabel(event("a", "Note", null))).toBe("no date · Note");
  });
});

describe("candidateWindow", () => {
  it("is just the encounter date unless nearby events are requested", () => {
    expect(candidateWindow("2026-03-10", false)).toEqual({ from: "2026-03-10", to: "2026-03-10" });
  });

  it("reaches the agreed number of days either side when nearby events are requested", () => {
    expect(candidateWindow("2026-03-10", true)).toEqual({
      from: shiftDate("2026-03-10", -NEARBY_DAYS),
      to: shiftDate("2026-03-10", NEARBY_DAYS),
    });
  });
});

describe("unlinked", () => {
  it("keeps only events with no encounter", () => {
    const events = [event("a", "Lab", "2026-03-04"), event("b", "Lab", "2026-03-04", { encounterUid: "enc-1" }), event("c", "Lab", "2026-03-04", { encounterUid: null })];
    expect(uids(unlinked(events))).toEqual(["a", "c"]);
  });
});

describe("checklistEvents", () => {
  it("lists each event once, by date then uid, whichever source it came from", () => {
    const member = event("m", "Lab", "2026-03-04", { encounterUid: "enc-1" });
    const picked = event("p", "Symptom", "2026-03-01");
    const suggestion = event("s", "ctDNA", "2026-03-04");

    const rows = checklistEvents([member], [picked, suggestion], [suggestion, member]);
    expect(uids(rows)).toEqual(["p", "m", "s"]);
  });

  it("puts undated events first rather than guessing a position", () => {
    const rows = checklistEvents([], [], [event("b", "Note", "2026-03-04"), event("a", "Note", null)]);
    expect(uids(rows)).toEqual(["a", "b"]);
  });
});

describe("membershipChanges", () => {
  it("links newly ticked events and removes unticked members", () => {
    expect(membershipChanges(["a", "b"], new Set(["b", "c", "d"]))).toEqual({ toLink: ["c", "d"], toUnlink: ["a"] });
  });

  it("changes nothing when the ticks match the members", () => {
    expect(membershipChanges(["a", "b"], new Set(["a", "b"]))).toEqual({ toLink: [], toUnlink: [] });
    expect(membershipChanges([], new Set())).toEqual({ toLink: [], toUnlink: [] });
  });
});

describe("withEncounterLink", () => {
  const stored = event("n1", "Note", "2026-03-04", {
    payload: {
      id: "n1",
      fields: { Event_UID: "n1", Event_Type: "Note", Event_Date: "2026-03-04", Event_Details: "x", Document_Attachment: ["doc-1"] },
    },
  });

  it("adds the link and keeps every other field", () => {
    const record = withEncounterLink(stored, "enc-1");
    expect(record.id).toBe("n1");
    expect(record.fields).toEqual({ ...stored.payload.fields, Encounter_UID: "enc-1" });
  });

  it("replaces an existing link and can remove it", () => {
    const linked = { ...stored, payload: { ...stored.payload, fields: { ...stored.payload.fields, Encounter_UID: "old" } } };
    expect(withEncounterLink(linked, "new").fields.Encounter_UID).toBe("new");
    expect("Encounter_UID" in withEncounterLink(linked, null).fields).toBe(false);
  });

  it("does not change the stored event it was built from", () => {
    const before = JSON.stringify(stored);
    withEncounterLink(stored, "enc-1");
    expect(JSON.stringify(stored)).toBe(before);
  });
});
