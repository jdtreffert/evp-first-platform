import { describe, expect, it } from "vitest";
import type { Encounter } from "../../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { groupTimeline } from "../encounterGroups";
import type { TimelineEntry } from "../encounterGroups";

function event(uid: string, eventType: string, eventDate: string | null, encounterUid?: string | null): UnifiedEvent {
  return { uid, masterId: "M1", eventType, eventDate, encounterUid, payload: { id: uid, fields: {} } };
}

function encounter(uid: string, encounterDate: string): Encounter {
  return { uid, masterId: "M1", encounterDate, payload: { id: uid, fields: {} } };
}

/** A compact description of a timeline: "enc:<uid>[member,member]" or "ev:<uid>". */
function shape(entries: TimelineEntry[]): string[] {
  return entries.map((entry) =>
    entry.kind === "encounter"
      ? `enc:${entry.group.encounter.uid}[${entry.group.events.map((e) => e.uid).join(",")}]`
      : `ev:${entry.event.uid}`,
  );
}

describe("groupTimeline", () => {
  const encounters = [encounter("infusion", "2026-03-04"), encounter("imaging", "2026-02-10")];

  it("groups events that link to the same encounter, and leaves the rest on their own, newest first", () => {
    const events = [
      event("symptom", "Symptom", "2026-03-02"),
      event("delivery", "Treatment_Delivery", "2026-03-04", "infusion"),
      event("lab", "Lab", "2026-03-04", "infusion"),
      event("ctdna", "ctDNA", "2026-03-04", "infusion"),
      event("scan", "Imaging", "2026-02-10", "imaging"),
      event("note", "Note", "2026-01-05"),
    ];

    expect(shape(groupTimeline(events, encounters))).toEqual([
      "enc:infusion[ctdna,delivery,lab]",
      "ev:symptom",
      "enc:imaging[scan]",
      "ev:note",
    ]);
  });

  it("never groups events by date alone", () => {
    const events = [event("a", "Lab", "2026-03-04"), event("b", "ctDNA", "2026-03-04")];
    expect(shape(groupTimeline(events, encounters))).toEqual(["ev:a", "ev:b"]);
  });

  it("places an encounter by its own date, independent of its events' dates", () => {
    const events = [
      event("early", "Symptom", "2026-03-01", "infusion"),
      event("middle", "Note", "2026-03-03"),
    ];
    // The encounter is dated 2026-03-04, after "middle", although its member is dated before it.
    expect(shape(groupTimeline(events, encounters))).toEqual(["enc:infusion[early]", "ev:middle"]);
  });

  it("can run oldest first, ordering members the same way", () => {
    const events = [
      event("late", "Lab", "2026-03-05", "infusion"),
      event("early", "Lab", "2026-03-03", "infusion"),
      event("note", "Note", "2026-01-05"),
    ];
    expect(shape(groupTimeline(events, encounters, "asc"))).toEqual(["ev:note", "enc:infusion[early,late]"]);
    expect(shape(groupTimeline(events, encounters, "desc"))).toEqual(["enc:infusion[late,early]", "ev:note"]);
  });

  it("shows an event on its own when its encounter is not among those given", () => {
    const events = [event("orphan", "Lab", "2026-03-04", "not-loaded"), event("none", "Lab", "2026-03-03", null)];
    expect(shape(groupTimeline(events, encounters))).toEqual(["ev:orphan", "ev:none"]);
  });

  it("leaves out encounters that have none of the given events", () => {
    expect(shape(groupTimeline([event("n", "Note", "2026-03-01")], encounters))).toEqual(["ev:n"]);
    expect(groupTimeline([], encounters)).toEqual([]);
  });

  it("puts undated entries last in either direction", () => {
    const events = [event("undated", "Note", null), event("dated", "Note", "2026-03-01")];
    expect(shape(groupTimeline(events, encounters, "desc"))).toEqual(["ev:dated", "ev:undated"]);
    expect(shape(groupTimeline(events, encounters, "asc"))).toEqual(["ev:dated", "ev:undated"]);
  });

  it("lists an encounter before a single event on the same date, then by uid", () => {
    const events = [event("b", "Note", "2026-03-04"), event("a", "Note", "2026-03-04"), event("m", "Lab", "2026-03-04", "infusion")];
    expect(shape(groupTimeline(events, encounters))).toEqual(["enc:infusion[m]", "ev:a", "ev:b"]);
  });

  it("does not change the events or encounters it is given", () => {
    const events = [event("a", "Lab", "2026-03-04", "infusion"), event("b", "Note", "2026-01-01")];
    const before = JSON.stringify({ events, encounters });
    groupTimeline(events, encounters);
    expect(JSON.stringify({ events, encounters })).toBe(before);
  });
});
