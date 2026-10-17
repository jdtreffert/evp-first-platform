import { describe, expect, it } from "vitest";
import type { Encounter } from "../../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { layoutPhaseView } from "../phaseLayout";
import { SUMMARY_LANES } from "../presentationPolicy";
import { SUMMARY_TITLE, buildSummaryView, describeSummaryDuration } from "../summaryView";
import type { SummaryView } from "../summaryView";
import { TREATMENT_COMPLETED } from "../treatmentPhase";

const TODAY = "2026-10-17";

function event(uid: string, eventType: string, eventDate: string | null, extra: Partial<UnifiedEvent> = {}): UnifiedEvent {
  return { uid, masterId: "M1", eventType, eventDate, payload: { id: uid, fields: {} }, ...extra };
}
const encounter = (uid: string, encounterDate: string): Encounter => ({ uid, masterId: "M1", encounterDate, payload: { id: uid, fields: {} } });
const status = (uid: string, eventDate: string | null, category: string, extra: Partial<UnifiedEvent> = {}) =>
  event(uid, "Disease_Status", eventDate, { diseaseStatusCategory: category, ...extra });
const completed = (uid: string, eventDate: string | null) => event(uid, "Treatment_Change", eventDate, { treatmentChangeType: TREATMENT_COMPLETED });
const crDecision = (uid: string, eventDate: string) => event(uid, "Decision", eventDate, { decisionType: "Complete response confirmed" });

const view = (events: UnifiedEvent[], encounters: Encounter[] = [], today = TODAY): SummaryView => buildSummaryView(events, encounters, { today });
const laneShape = (v: SummaryView) => Object.fromEntries(v.lanes.map((lane) => [lane.lane.label, lane.events.map((e) => e.event.uid)]));

// A full journey with routine events that must not appear.
const journey: UnifiedEvent[] = [
  event("symptom", "Symptom", "2026-03-01"),
  event("diagnosis", "Diagnosis", "2026-04-10"),
  event("decision", "Decision", "2026-04-20", { decisionType: "Proceed with EVP" }),
  event("start", "Treatment_Start", "2026-05-01"),
  event("delivery-1", "Treatment_Delivery", "2026-05-08"),
  event("change", "Treatment_Change", "2026-06-15", { treatmentChangeType: "Dose reduction" }),
  event("response", "Treatment_Response", "2026-07-20", { treatmentResponseCategory: "CR" }),
  completed("done", "2026-08-01"),
  crDecision("cr", "2026-08-20"),
  event("ctdna", "ctDNA", "2026-08-25"),
  status("ned", "2026-09-01", "No evidence of disease"),
  event("scan", "Imaging", "2026-09-20"),
  status("suspicious", "2026-10-01", "Indeterminate or suspicious"),
  event("recurrence", "Recurrence", "2026-10-10"),
];

describe("what the Summary shows", () => {
  it("has the title, and shows only the major milestones, none of the routine evidence or deliveries", () => {
    const v = view(journey);

    expect(v.title).toBe("Journey Summary");
    expect(SUMMARY_TITLE).toBe("Journey Summary");
    const shown = v.milestones.map((m) => m.view.event.uid);
    expect(shown).toEqual(["diagnosis", "start", "change", "done", "cr", "ned", "suspicious", "recurrence"]);
    for (const hidden of ["symptom", "decision", "delivery-1", "response", "ctdna", "scan"]) expect(shown).not.toContain(hidden);
  });

  it("draws every milestone as a diamond, in two Summary lanes in order, with only the lanes that have events", () => {
    const v = view(journey);

    expect(v.lanes.map((lane) => lane.lane.label)).toEqual(["Journey Milestones", "Response & Disease Status"]);
    expect(v.lanes.map((lane) => lane.lane.id)).toEqual(SUMMARY_LANES.map((lane) => lane.id));
    expect(laneShape(v)).toEqual({
      "Journey Milestones": ["diagnosis", "start", "change", "done"],
      "Response & Disease Status": ["cr", "ned", "suspicious", "recurrence"],
    });
    expect(v.milestones.every((m) => m.view.presentation.milestone)).toBe(true);
  });

  it("puts Diagnosis, Treatment Start, Treatment Changes and the completion in Journey Milestones, and the rest in Response & Disease Status", () => {
    const lanes = Object.fromEntries(view(journey).milestones.map((m) => [m.view.event.uid, m.view.presentation.lane.label]));

    for (const uid of ["diagnosis", "start", "change", "done"]) expect(lanes[uid]).toBe("Journey Milestones");
    for (const uid of ["cr", "ned", "suspicious", "recurrence"]) expect(lanes[uid]).toBe("Response & Disease Status");
  });

  it("draws only the lanes that have milestones", () => {
    expect(view([event("diagnosis", "Diagnosis", "2026-04-10")]).lanes.map((l) => l.lane.label)).toEqual(["Journey Milestones"]);
    expect(view([status("ned", "2026-09-01", "No evidence of disease")]).lanes.map((l) => l.lane.label)).toEqual(["Response & Disease Status"]);
  });

  it("labels each milestone from structured fields only", () => {
    const labels = Object.fromEntries(view(journey).milestones.map((m) => [m.view.event.uid, m.view.label]));

    expect(labels).toEqual({
      diagnosis: "Diagnosis",
      start: "Treatment Start",
      change: "Dose reduction",
      done: "Treatment completed",
      cr: "Complete response confirmed",
      ned: "No evidence of disease",
      suspicious: "Indeterminate or suspicious",
      recurrence: "Recurrence",
    });
  });

  it("names a Treatment_Change from its type, never from its reason or regimen text", () => {
    const labelled = (extra: Partial<UnifiedEvent>) => view([event("c", "Treatment_Change", "2026-06-15", extra)]).milestones[0].view.label;

    expect(labelled({ treatmentChangeReason: "Completed all cycles", treatmentRegimenDetails: "Treatment completed" })).toBe("Treatment Change");
    expect(labelled({ treatmentChangeType: "Hold", treatmentChangeReason: "Treatment completed" })).toBe("Treatment hold");
    expect(labelled({ treatmentChangeType: "Not a real type" })).toBe("Treatment Change");
  });

  it("labels a Disease_Status by its category only, and falls back for an unrecognised value", () => {
    const labelled = (category: string | null, notes?: string) =>
      view([status("s", "2026-09-01", category as string, { diseaseStatusNotes: notes })]).milestones[0].view.label;

    expect(labelled("Disease present")).toBe("Disease present");
    expect(labelled("Unknown")).toBe("Disease status unknown");
    expect(labelled("Cured", "No evidence of disease")).toBe("Disease Status");
    expect(labelled(null, "Disease present")).toBe("Disease Status");
  });

  it("keeps the full chronological sequence after a recurrence or a status", () => {
    const sequence = view(journey).lanes.find((l) => l.lane.id === "response-disease-status")!.events.map((e) => e.label);
    expect(sequence).toEqual(["Complete response confirmed", "No evidence of disease", "Indeterminate or suspicious", "Recurrence"]);
  });

  it("includes Recurrence and Progression only when those events exist, and does not infer them from a status", () => {
    const v = view([status("present", "2026-09-01", "Disease present"), status("suspicious", "2026-10-01", "Indeterminate or suspicious")]);

    expect(v.milestones.map((m) => m.view.event.eventType)).toEqual(["Disease_Status", "Disease_Status"]);
  });

  it("does not include another Decision, or a Decision carrying the value on another type", () => {
    const v = view([event("d", "Decision", "2026-04-20", { decisionType: "Hold treatment" }), event("n", "Note", "2026-04-21", { decisionType: "Complete response confirmed" })]);
    expect(v.empty).toBe(true);
  });
});

describe("ordering", () => {
  it("is chronological, and same-date milestones keep a deterministic uid order whatever order they arrive in", () => {
    const events = [
      event("z", "Recurrence", "2026-10-10"),
      status("b", "2026-09-01", "No evidence of disease"),
      status("a", "2026-09-01", "Unknown"),
      event("diagnosis", "Diagnosis", "2026-04-10"),
    ];

    expect(view(events).milestones.map((m) => m.view.event.uid)).toEqual(["diagnosis", "a", "b", "z"]);
    expect(view([...events].reverse()).milestones.map((m) => m.view.event.uid)).toEqual(["diagnosis", "a", "b", "z"]);
  });
});

describe("Today", () => {
  it("ends the timeline at the date given, as a labelled endpoint and not an event", () => {
    const v = view(journey);

    expect(v.today).toEqual({ day: TODAY });
    expect(v.references).toEqual([{ day: TODAY, label: "Today" }]);
    expect(v.range.end).toBe(TODAY);
    expect(v.milestones.map((m) => m.view.event.eventType)).not.toContain("Today");
    expect(v.milestones.every((m) => m.view.event.uid !== "today")).toBe(true);
  });

  it("is never labelled with a status, whatever is recorded", () => {
    const text = JSON.stringify(view([status("ned", "2020-01-01", "No evidence of disease")]).references);
    expect(text).toBe('[{"day":"2026-10-17","label":"Today"}]');
    expect(text).not.toMatch(/NED|disease|remission|recurren|progress/i);
  });

  it("gives the same view for the same events and date, whatever the clock says, and a different one for another date", () => {
    expect(JSON.stringify(view(journey))).toBe(JSON.stringify(view(journey)));
    expect(view(journey, [], "2027-01-01").range.end).toBe("2027-01-01");
  });

  it("must be a real date string", () => {
    expect(() => view(journey, [], "")).toThrow(/today/i);
    expect(() => view(journey, [], "yesterday")).toThrow(/today/i);
  });

  it("extends the range to a milestone dated after today, which stays where it is", () => {
    const v = view([event("diagnosis", "Diagnosis", "2026-04-10"), event("future", "Recurrence", "2026-12-01")]);
    expect(v.range).toEqual({ start: "2026-04-10", end: "2026-12-01" });
    expect(v.references[0].day).toBe(TODAY);
  });
});

describe("derived durations", () => {
  it("measures the time since the Diagnosis, the Treatment Start and the Treatment completed to today", () => {
    const v = view(journey);

    expect(v.durations.map((d) => [d.id, d.status, d.sourceEventUid, d.sourceEventDate, d.endpoint, d.days])).toEqual([
      ["since-diagnosis", "available", "diagnosis", "2026-04-10", TODAY, 190],
      ["since-treatment-start", "available", "start", "2026-05-01", TODAY, 169],
      ["since-treatment-completion", "available", "done", "2026-08-01", TODAY, 77],
    ]);
    expect(v.durations.map((d) => d.text)).toEqual(["6 months, 7 days (190 days)", "5 months, 16 days (169 days)", "2 months, 16 days (77 days)"]);
    expect(v.durations.map((d) => d.label)).toEqual(["Time since Diagnosis", "Time since Treatment Start", "Time since Treatment Completion"]);
  });

  it("draws an arrow to today for each available duration, starting at its source date", () => {
    const v = view(journey);

    expect(v.spans).toEqual([
      { id: "since-diagnosis", fromDay: "2026-04-10", toDay: TODAY, label: "Time since Diagnosis: 6 months, 7 days (190 days)" },
      { id: "since-treatment-start", fromDay: "2026-05-01", toDay: TODAY, label: "Time since Treatment Start: 5 months, 16 days (169 days)" },
      { id: "since-treatment-completion", fromDay: "2026-08-01", toDay: TODAY, label: "Time since Treatment Completion: 2 months, 16 days (77 days)" },
    ]);
  });

  it("marks the anchor milestones, and no others", () => {
    const anchors = Object.fromEntries(view(journey).milestones.filter((m) => m.anchor).map((m) => [m.view.event.uid, m.anchor]));
    expect(anchors).toEqual({ diagnosis: "diagnosis", start: "treatment-start", done: "treatment-completion" });
  });

  it("states each duration in words with what it was measured from and to", () => {
    expect(view(journey).durations.map(describeSummaryDuration)).toEqual([
      "Time since Diagnosis: 6 months, 7 days (190 days), from the Diagnosis on April 10, 2026 to October 17, 2026.",
      "Time since Treatment Start: 5 months, 16 days (169 days), from the Treatment Start on May 1, 2026 to October 17, 2026.",
      "Time since Treatment Completion: 2 months, 16 days (77 days), from the Treatment Completion on August 1, 2026 to October 17, 2026.",
    ]);
  });

  it("has no completion arrow while treatment has not completed, and says why", () => {
    const v = view(journey.filter((e) => e.uid !== "done"));

    expect(v.durations.map((d) => d.status)).toEqual(["available", "available", "unavailable"]);
    expect(v.durations[2]).toMatchObject({ reason: "no-event", sourceEventUid: null, sourceEventDate: null, days: null, text: null });
    expect(v.spans.map((s) => s.id)).toEqual(["since-diagnosis", "since-treatment-start"]);
    expect(describeSummaryDuration(v.durations[2])).toBe("Time since Treatment Completion: not available (no Treatment Completion is recorded).");
  });

  it("is unavailable, with no arrow and no substitute, when an anchor is missing or has no valid date", () => {
    const v = view([
      event("diagnosis", "Diagnosis", null),
      event("delivery", "Treatment_Delivery", "2026-05-08", { encounterUid: "visit" }),
      status("ned", "2026-09-01", "No evidence of disease"),
      crDecision("cr", "2026-09-02"),
      event("scan", "Imaging", "2026-09-15"),
    ], [encounter("visit", "2026-05-08")]);

    expect(v.durations.map((d) => [d.id, d.status, d.reason, d.sourceEventUid])).toEqual([
      ["since-diagnosis", "unavailable", "undated-event", null],
      ["since-treatment-start", "unavailable", "no-event", null],
      ["since-treatment-completion", "unavailable", "no-event", null],
    ]);
    expect(v.spans).toEqual([]);
    expect(describeSummaryDuration(v.durations[0])).toContain("the recorded Diagnosis has no valid date");
  });

  it("does not show a negative time for an anchor dated after today, but keeps its source", () => {
    const v = view([event("diagnosis", "Diagnosis", "2026-12-01")]);

    expect(v.durations[0]).toMatchObject({ status: "unavailable", reason: "anchor-after-today", sourceEventUid: "diagnosis", sourceEventDate: "2026-12-01", days: null });
    expect(v.spans).toEqual([]);
  });

  it("measures a same-day anchor as 0 days", () => {
    expect(view([event("diagnosis", "Diagnosis", TODAY)]).durations[0]).toMatchObject({ status: "available", days: 0, text: "0 days" });
  });

  it("uses the earliest Treatment_Start and the Diagnosis chosen by uid when asked", () => {
    const events = [event("diagnosis", "Diagnosis", "2026-04-10"), event("second", "Diagnosis", "2026-06-01"), event("start-2", "Treatment_Start", "2026-07-01"), event("start-1", "Treatment_Start", "2026-05-01")];
    const chosen = buildSummaryView(events, [], { today: TODAY, diagnosisUid: "second" });

    expect(view(events).durations.map((d) => d.sourceEventUid)).toEqual(["diagnosis", "start-1", null]);
    expect(chosen.durations[0].sourceEventUid).toBe("second");
    // Every Diagnosis and Treatment_Start event is still drawn; the anchor is only the one measured from.
    expect(view(events).milestones).toHaveLength(4);
  });

  it("does not infer the completion from later events, a status or a confirmed complete response", () => {
    const v = view([event("start", "Treatment_Start", "2026-05-01"), crDecision("cr", "2026-09-02"), status("ned", "2026-09-03", "No evidence of disease"), event("scan", "Imaging", "2026-09-15")]);
    expect(v.durations[2]).toMatchObject({ status: "unavailable", reason: "no-event" });
  });

  it("does not measure from a completion that treatment continued after", () => {
    const v = view([...journey, event("again", "Treatment_Delivery", "2026-09-10")]);
    expect(v.durations[2]).toMatchObject({ status: "unavailable", reason: "treatment-continued" });
  });
});

describe("the latest recorded disease status", () => {
  it("is the latest recorded Disease_Status by its date, with no claim that it holds today", () => {
    expect(view(journey).diseaseStatus).toMatchObject({ status: "recorded", day: "2026-10-01", category: "Indeterminate or suspicious" });
  });

  it("is not recorded when there is none, whatever else is recorded: a complete response is not a status", () => {
    const v = view(journey.filter((e) => e.eventType !== "Disease_Status"));

    expect(v.diseaseStatus.status).toBe("not-recorded");
    expect(JSON.stringify(v.diseaseStatus)).not.toMatch(/No evidence of disease/);
  });

  it("is not recorded for an empty journey", () => {
    expect(view([]).diseaseStatus).toEqual({ status: "not-recorded", latestMilestone: null, undated: [] });
  });
});

describe("empty and partial journeys", () => {
  it("gives an empty view, with today and every duration unavailable, when there are no events", () => {
    const v = view([]);

    expect(v.empty).toBe(true);
    expect(v.lanes).toEqual([]);
    expect(v.milestones).toEqual([]);
    expect(v.range).toEqual({ start: TODAY, end: TODAY });
    expect(v.today.day).toBe(TODAY);
    expect(v.durations.every((d) => d.status === "unavailable")).toBe(true);
    expect(v.spans).toEqual([]);
    expect(() => layoutPhaseView(v)).not.toThrow();
  });

  it("handles a Diagnosis alone", () => {
    const v = view([event("diagnosis", "Diagnosis", "2026-04-10")]);

    expect(v.milestones.map((m) => m.view.label)).toEqual(["Diagnosis"]);
    expect(v.durations.map((d) => d.status)).toEqual(["available", "unavailable", "unavailable"]);
  });

  it("handles treatment that has started but not completed", () => {
    const v = view([event("diagnosis", "Diagnosis", "2026-04-10"), event("start", "Treatment_Start", "2026-05-01")]);
    expect(v.durations.map((d) => d.status)).toEqual(["available", "available", "unavailable"]);
  });

  it("handles a completion with no status after it, and no complete response decision", () => {
    const v = view(journey.filter((e) => !["cr", "ned", "suspicious", "recurrence"].includes(e.uid)));

    expect(v.lanes.map((l) => l.lane.label)).toEqual(["Journey Milestones"]);
    expect(v.diseaseStatus.status).toBe("not-recorded");
  });

  it("handles a status with no Diagnosis or treatment at all", () => {
    const v = view([status("ned", "2026-09-01", "No evidence of disease")]);

    expect(v.milestones).toHaveLength(1);
    expect(v.durations.every((d) => d.status === "unavailable")).toBe(true);
  });

  it("reports milestone events with a missing or invalid date and does not place them", () => {
    const v = view([event("diagnosis", "Diagnosis", "2026-04-10"), event("no-date", "Recurrence", null), status("bad", "13/45/2026", "Unknown")]);

    expect(v.milestones.map((m) => m.view.event.uid)).toEqual(["diagnosis"]);
    expect(v.undated.map((e) => e.uid)).toEqual(["bad", "no-date"]);
    expect(v.empty).toBe(false);
  });

  it("is empty, with the undated events listed, when every milestone event lacks a date", () => {
    const v = view([event("no-date", "Diagnosis", null)]);

    expect(v.empty).toBe(true);
    expect(v.undated.map((e) => e.uid)).toEqual(["no-date"]);
  });
});

describe("what is on record about each milestone", () => {
  it("exposes provenance, documents, relationship and encounter availability without copying the event", () => {
    const rich = status("ned", "2026-09-01", "No evidence of disease", {
      eventSource: "Clinician",
      recordedAt: "2026-09-02T10:00:00Z",
      recordedByRole: "patient",
      lastModifiedAt: "2026-09-03T10:00:00Z",
      lastModifiedByRole: "patient",
      documentAttachment: ["doc-1", "doc-2"],
      documentType: "Visit Summary",
      relatedEventUid: "scan",
      eventRelationship: "Derived_From",
      encounterUid: "visit",
    });
    const bare = event("diagnosis", "Diagnosis", "2026-04-10");
    const v = view([bare, rich, event("scan", "Imaging", "2026-08-30")], [encounter("visit", "2026-09-01")]);
    const [first, second] = v.milestones;

    expect(first).toMatchObject({
      provenance: { available: false, source: null, recordedAt: null },
      documents: { count: 0, type: null, available: false },
      relatedEventUid: null,
      relationship: null,
      encounterUid: null,
    });
    expect(second).toMatchObject({
      provenance: { available: true, source: "Clinician", recordedAt: "2026-09-02T10:00:00Z", recordedByRole: "patient", lastModifiedAt: "2026-09-03T10:00:00Z" },
      documents: { count: 2, type: "Visit Summary", available: true },
      relatedEventUid: "scan",
      relationship: "Derived_From",
      encounterUid: "visit",
    });
    // The detail panel reads the canonical event itself, not a Summary-specific copy.
    expect(second.view.event).toBe(rich);
    expect(second.view.encounter?.uid).toBe("visit");
  });
});

describe("encounters", () => {
  const visit = encounter("visit", "2026-09-01");

  it("connects two or more milestones that record the same Encounter_UID, and has no encounter lane", () => {
    const v = view([
      completed("done", "2026-08-01"),
      status("ned", "2026-09-01", "No evidence of disease", { encounterUid: "visit" }),
      { ...crDecision("cr", "2026-09-01"), encounterUid: "visit" },
    ], [visit]);

    expect(v.encounters).toHaveLength(1);
    expect(v.encounters[0].members.map((m) => m.event.uid)).toEqual(["cr", "ned"]);
    expect(v.encounters[0].crossLane).toBe(false);
    expect(v.lanes.map((l) => l.lane.label)).not.toContain("Encounters");
  });

  it("draws no connector for a single milestone, but the milestone still knows its encounter", () => {
    const v = view([event("diagnosis", "Diagnosis", "2026-04-10", { encounterUid: "visit" })], [visit]);

    expect(v.encounters).toEqual([]);
    expect(v.milestones[0].view.encounter?.uid).toBe("visit");
    expect(v.range).toEqual({ start: "2026-04-10", end: TODAY });
  });

  it("does not count a routine event that shares the encounter, but tells how many events fall outside the Summary", () => {
    const v = view([
      status("ned", "2026-09-01", "No evidence of disease", { encounterUid: "visit" }),
      event("scan", "Imaging", "2026-09-01", { encounterUid: "visit" }),
      event("lab", "Lab", "2026-09-01", { encounterUid: "visit" }),
    ], [visit]);

    expect(v.encounters).toEqual([]);
    const withTwo = view([
      status("ned", "2026-09-01", "No evidence of disease", { encounterUid: "visit" }),
      event("recurrence", "Recurrence", "2026-09-01", { encounterUid: "visit" }),
      event("scan", "Imaging", "2026-09-01", { encounterUid: "visit" }),
    ], [visit]);
    expect(withTwo.encounters[0]).toMatchObject({ outsideCount: 1 });
  });

  it("never infers membership from equal dates", () => {
    const v = view([event("diagnosis", "Diagnosis", "2026-09-01"), status("ned", "2026-09-01", "No evidence of disease")], [visit]);
    expect(v.encounters).toEqual([]);
  });

  it("keeps the event date and the encounter date separate: the milestone sits at its own date", () => {
    const v = view([
      status("a", "2026-08-30", "No evidence of disease", { encounterUid: "visit" }),
      status("b", "2026-09-01", "Unknown", { encounterUid: "visit" }),
    ], [visit]);

    expect(v.encounters[0].day).toBe("2026-09-01");
    expect(v.milestones.map((m) => m.view.day)).toEqual(["2026-08-30", "2026-09-01"]);
  });
});

describe("layout", () => {
  it("is laid out by the shared layout: Today as a reference line, the durations as arrows above the lanes", () => {
    const layout = layoutPhaseView(view(journey));

    expect(layout.references.map((r) => r.label)).toEqual(["Today"]);
    expect(layout.spans.map((s) => s.id)).toEqual(["since-diagnosis", "since-treatment-start", "since-treatment-completion"]);
    expect(layout.spanBandHeight).toBe(3 * 28);
    expect(layout.lanes[0].top).toBe(layout.axisHeight);
    // Every arrow ends at Today's line.
    for (const span of layout.spans) expect(span.x2).toBe(layout.references[0].x);
  });
});

describe("the Summary changes nothing", () => {
  it("does not mutate the events or encounters it is given, and creates none", () => {
    const encounters = [encounter("visit", "2026-09-01")];
    const before = JSON.stringify({ journey, encounters });
    const v = view(journey, encounters);

    expect(JSON.stringify({ journey, encounters })).toBe(before);
    expect(journey).toHaveLength(14);
    expect(v.milestones.every((m) => journey.includes(m.view.event))).toBe(true);
  });
});
