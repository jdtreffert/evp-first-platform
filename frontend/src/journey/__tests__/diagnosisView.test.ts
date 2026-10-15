import { describe, expect, it } from "vitest";
import type { Encounter } from "../../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { buildDiagnosisView } from "../diagnosisView";
import type { DiagnosisView } from "../diagnosisView";

function event(uid: string, eventType: string, eventDate: string | null, encounterUid?: string): UnifiedEvent {
  return { uid, masterId: "M1", eventType, eventDate, encounterUid, payload: { id: uid, fields: {} } };
}

function encounter(uid: string, encounterDate: string): Encounter {
  return { uid, masterId: "M1", encounterDate, payload: { id: uid, fields: {} } };
}

const laneShape = (view: DiagnosisView) =>
  Object.fromEntries(view.lanes.map((lane) => [lane.lane.label, lane.events.map((e) => e.event.uid)]));

/** A journey shaped like the reference one: work-up, diagnosis, then decision and treatment. */
const journey = [
  event("symptom", "Symptom", "2026-02-01"),
  event("scan-1", "Imaging", "2026-02-15"),
  event("cysto", "Cystoscopy", "2026-03-01"),
  event("turbt", "TURBT", "2026-03-10"),
  event("path", "Pathology", "2026-03-20"),
  event("scan-2", "Imaging", "2026-04-05"),
  event("diagnosis", "Diagnosis", "2026-04-10"),
  event("decision", "Decision", "2026-04-20"),
  event("treatment-start", "Treatment_Start", "2026-05-01"),
];

describe("buildDiagnosisView", () => {
  it("lays the Diagnosis phase out in lanes, earliest first, with only the lanes that have events", () => {
    const view = buildDiagnosisView(journey, [])!;

    expect(laneShape(view)).toEqual({
      "Symptoms & Experience": ["symptom"],
      Investigations: ["scan-1", "cysto", "scan-2"],
      Procedures: ["turbt"],
      "Pathology & Molecular": ["path"],
      "Decisions & Milestones": ["diagnosis"],
    });
    expect(view.lanes.map((lane) => lane.lane.label)).not.toContain("Context & Self-Management");
  });

  it("leaves out events after the Diagnosis date and every treatment event", () => {
    const view = buildDiagnosisView(journey, [])!;
    const all = view.lanes.flatMap((lane) => lane.events.map((e) => e.event.uid));

    expect(all).not.toContain("decision");
    expect(all).not.toContain("treatment-start");
  });

  it("marks the Diagnosis event as the milestone, as it appears in its lane", () => {
    const view = buildDiagnosisView(journey, [])!;

    expect(view.milestone.event.uid).toBe("diagnosis");
    expect(view.milestone.presentation.milestone).toBe(true);
    const placed = view.lanes.flatMap((lane) => lane.events).find((e) => e.event.uid === "diagnosis")!;
    expect(placed.presentation.milestone).toBe(true);
    expect(view.lanes.flatMap((lane) => lane.events).filter((e) => e.presentation.milestone)).toHaveLength(1);
  });

  it("carries the presentation of each event and its own date", () => {
    const view = buildDiagnosisView(journey, [])!;
    const symptom = view.lanes[0].events[0];

    expect(symptom.day).toBe("2026-02-01");
    expect(symptom.presentation).toMatchObject({ label: "Symptom", assigned: true });
    expect(view.range).toEqual({ start: "2026-02-01", end: "2026-04-10" });
  });

  it("returns null when there is no dated Diagnosis event", () => {
    expect(buildDiagnosisView([], [])).toBeNull();
    expect(buildDiagnosisView([event("s", "Symptom", "2026-02-01")], [])).toBeNull();
  });

  it("draws events with no assigned lane in the Other lane, last", () => {
    const view = buildDiagnosisView([...journey, event("recurrence", "Recurrence", "2026-04-01")], [])!;

    expect(view.lanes[view.lanes.length - 1].lane.id).toBe("other");
    expect(laneShape(view).Other).toEqual(["recurrence"]);
  });

  it("keeps undated events out of the lanes and reports them", () => {
    const view = buildDiagnosisView([...journey, event("unknown-date", "Lab", null)], [])!;

    expect(view.undated.map((e) => e.uid)).toEqual(["unknown-date"]);
    expect(view.lanes.flatMap((lane) => lane.events).map((e) => e.event.uid)).not.toContain("unknown-date");
  });

  it("can be built around another Diagnosis event and lists the candidates", () => {
    const events = [...journey, event("restaging", "Diagnosis", "2026-09-01"), event("late-scan", "Imaging", "2026-07-01")];
    const view = buildDiagnosisView(events, [], { diagnosisUid: "restaging" })!;

    expect(view.milestone.event.uid).toBe("restaging");
    expect(view.diagnosisCandidates.map((e) => e.uid)).toEqual(["diagnosis", "restaging"]);
    expect(laneShape(view).Investigations).toContain("late-scan");
  });
});

describe("encounters in the Diagnosis view", () => {
  const imagingVisit = encounter("imaging-visit", "2026-02-15");
  const clinic = encounter("clinic", "2026-04-10");

  it("joins events of the same encounter across lanes, using only the recorded link", () => {
    const events = [
      event("symptom", "Symptom", "2026-04-10", "clinic"),
      event("scan", "Imaging", "2026-04-05", "clinic"),
      event("diagnosis", "Diagnosis", "2026-04-10", "clinic"),
      event("same-day-unlinked", "Lab", "2026-04-10"),
    ];
    const view = buildDiagnosisView(events, [clinic])!;

    expect(view.encounters).toHaveLength(1);
    const connector = view.encounters[0];
    expect(connector.members.map((m) => m.event.uid)).toEqual(["scan", "diagnosis", "symptom"]);
    expect(connector.laneIds).toEqual(["symptoms-experience", "investigations", "decisions-milestones"]);
    expect(connector.crossLane).toBe(true);
    expect(connector.day).toBe("2026-04-10");
    expect(view.encounters.flatMap((c) => c.members.map((m) => m.event.uid))).not.toContain("same-day-unlinked");
  });

  it("keeps each member at its own date, independent of the encounter's date", () => {
    const events = [event("scan", "Imaging", "2026-04-05", "clinic"), event("diagnosis", "Diagnosis", "2026-04-10", "clinic")];
    const connector = buildDiagnosisView(events, [clinic])!.encounters[0];

    expect(connector.members.map((m) => m.day)).toEqual(["2026-04-05", "2026-04-10"]);
    expect(connector.day).toBe("2026-04-10");
  });

  it("counts members that are outside the phase, among the events given", () => {
    const events = [
      event("diagnosis", "Diagnosis", "2026-04-10", "clinic"),
      event("decision", "Decision", "2026-04-20", "clinic"),
      event("treatment", "Treatment_Start", "2026-05-01", "clinic"),
    ];
    const connector = buildDiagnosisView(events, [clinic])!.encounters[0];

    expect(connector.members.map((m) => m.event.uid)).toEqual(["diagnosis"]);
    expect(connector.outsideCount).toBe(2);
    expect(connector.crossLane).toBe(false);
  });

  it("leaves out encounters with no member in the phase", () => {
    const events = [event("diagnosis", "Diagnosis", "2026-04-10"), event("decision", "Decision", "2026-04-20", "clinic")];
    expect(buildDiagnosisView(events, [clinic])!.encounters).toEqual([]);
  });

  it("shows an event normally when its encounter is not among those given, or it has none", () => {
    const events = [event("diagnosis", "Diagnosis", "2026-04-10", "not-loaded"), event("scan", "Imaging", "2026-04-05")];
    const view = buildDiagnosisView(events, [clinic])!;

    expect(view.encounters).toEqual([]);
    expect(view.lanes.flatMap((lane) => lane.events).every((e) => e.encounter === null)).toBe(true);
    expect(view.milestone.encounter).toBeNull();
  });

  it("resolves each event's encounter and orders connectors by the encounter's date", () => {
    const events = [
      event("diagnosis", "Diagnosis", "2026-04-10", "clinic"),
      event("symptom", "Symptom", "2026-02-10", "imaging-visit"),
    ];
    const view = buildDiagnosisView(events, [clinic, imagingVisit])!;

    expect(view.encounters.map((c) => c.encounter.uid)).toEqual(["imaging-visit", "clinic"]);
    expect(view.milestone.encounter?.uid).toBe("clinic");
  });

  it("extends the date range to an encounter dated outside its members' dates", () => {
    const later = encounter("later-visit", "2026-06-01");
    const events = [event("symptom", "Symptom", "2026-02-01", "later-visit"), event("diagnosis", "Diagnosis", "2026-04-10")];
    const view = buildDiagnosisView(events, [later])!;

    expect(view.range).toEqual({ start: "2026-02-01", end: "2026-06-01" });
  });

  it("does not change the events or encounters it is given", () => {
    const events = [event("diagnosis", "Diagnosis", "2026-04-10", "clinic"), event("scan", "Imaging", "2026-04-05")];
    const before = JSON.stringify({ events, encounters: [clinic] });
    buildDiagnosisView(events, [clinic]);

    expect(JSON.stringify({ events, encounters: [clinic] })).toBe(before);
  });
});
