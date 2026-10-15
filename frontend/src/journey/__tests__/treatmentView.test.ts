import { describe, expect, it } from "vitest";
import type { Encounter } from "../../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { layoutPhaseView } from "../phaseLayout";
import { TREATMENT_COMPLETED } from "../treatmentPhase";
import { buildTreatmentView } from "../treatmentView";
import type { TreatmentView } from "../treatmentView";

function event(uid: string, eventType: string, eventDate: string | null, extra: Partial<UnifiedEvent> = {}): UnifiedEvent {
  return { uid, masterId: "M1", eventType, eventDate, payload: { id: uid, fields: {} }, ...extra };
}

function encounter(uid: string, encounterDate: string): Encounter {
  return { uid, masterId: "M1", encounterDate, payload: { id: uid, fields: {} } };
}

const laneShape = (view: TreatmentView) =>
  Object.fromEntries(view.lanes.map((lane) => [lane.lane.label, lane.events.map((e) => e.event.uid)]));

const infusion = encounter("infusion-2", "2026-05-31");

const journey = [
  event("diagnosis", "Diagnosis", "2026-04-10"),
  event("decision", "Decision", "2026-04-20"),
  event("start", "Treatment_Start", "2026-05-01", { encounterUid: "infusion-1" }),
  event("delivery-1", "Treatment_Delivery", "2026-05-10", { encounterUid: "infusion-1" }),
  event("lab-1", "Lab", "2026-05-10", { encounterUid: "infusion-1" }),
  event("delivery-2", "Treatment_Delivery", "2026-05-31", { encounterUid: "infusion-2" }),
  event("lab-2", "Lab", "2026-05-31", { encounterUid: "infusion-2" }),
  event("ctdna-2", "ctDNA", "2026-05-31", { encounterUid: "infusion-2" }),
  event("nausea", "Symptom", "2026-06-02"),
  event("response", "Treatment_Response", "2026-06-15"),
  event("change", "Treatment_Change", "2026-06-20", { treatmentChangeType: "Regimen change" }),
  event("done", "Treatment_Change", "2026-08-01", { treatmentChangeType: TREATMENT_COMPLETED }),
  event("surveillance-scan", "Imaging", "2026-09-15"),
];
const encounters = [encounter("infusion-1", "2026-05-10"), infusion];

describe("buildTreatmentView", () => {
  it("puts the treatment events in the Treatment lane first and response events in the next lane", () => {
    const view = buildTreatmentView(journey, encounters)!;

    expect(view.lanes.map((lane) => lane.lane.label)).toEqual([
      "Treatment",
      "Response & Disease Status",
      "Symptoms & Experience",
      "Investigations",
      "Decisions & Milestones",
    ]);
    expect(laneShape(view)).toEqual({
      Treatment: ["start", "delivery-1", "delivery-2", "change", "done"],
      "Response & Disease Status": ["response"],
      "Symptoms & Experience": ["nausea"],
      // Events on the same date are ordered by uid, so "ctdna-2" comes before "lab-2".
      Investigations: ["lab-1", "ctdna-2", "lab-2"],
      "Decisions & Milestones": ["decision"],
    });
  });

  it("marks the start, changes, completion and response as milestones, and routine events as ordinary", () => {
    const view = buildTreatmentView(journey, encounters)!;
    const events = view.lanes.flatMap((lane) => lane.events);
    const milestones = events.filter((e) => e.presentation.milestone).map((e) => e.event.uid);

    // Listed lane by lane: the Treatment lane first, then Response & Disease Status.
    expect(milestones).toEqual(["start", "change", "done", "response"]);
    expect(events.find((e) => e.event.uid === "delivery-1")!.presentation.milestone).toBe(false);
  });

  it("reports when the phase starts and ends", () => {
    const view = buildTreatmentView(journey, encounters)!;

    expect(view.diagnosis?.event.uid).toBe("diagnosis");
    expect(view.completion?.event.uid).toBe("done");
    expect(view.ongoing).toBe(false);
    expect(view.range).toEqual({ start: "2026-04-20", end: "2026-08-01" });
    expect(view.lanes.flatMap((l) => l.events).map((e) => e.event.uid)).not.toContain("surveillance-scan");
  });

  it("is ongoing when treatment has not been recorded as completed", () => {
    const view = buildTreatmentView(journey.filter((e) => e.uid !== "done"), encounters)!;

    expect(view.ongoing).toBe(true);
    expect(view.completion).toBeNull();
  });

  it("joins an infusion visit's delivery, lab and ctDNA across lanes with a line at the visit date", () => {
    const view = buildTreatmentView(journey, encounters)!;
    const second = view.encounters.find((c) => c.encounter.uid === "infusion-2")!;

    expect(second.members.map((m) => m.event.uid)).toEqual(["ctdna-2", "delivery-2", "lab-2"]);
    expect(second.laneIds).toEqual(["treatment", "investigations"]);
    expect(second.crossLane).toBe(true);
    expect(view.encounters.map((c) => c.encounter.uid)).toEqual(["infusion-1", "infusion-2"]);
  });

  it("does not join events that only share a date with an infusion", () => {
    const view = buildTreatmentView([...journey, event("same-day-note", "Note", "2026-05-31")], encounters)!;
    const second = view.encounters.find((c) => c.encounter.uid === "infusion-2")!;

    expect(second.members.map((m) => m.event.uid)).not.toContain("same-day-note");
  });

  it("counts an encounter's events that fall outside the phase", () => {
    const view = buildTreatmentView([...journey, event("late-visit-lab", "Lab", "2026-09-15", { encounterUid: "infusion-2" })], encounters)!;

    expect(view.encounters.find((c) => c.encounter.uid === "infusion-2")!.outsideCount).toBe(1);
  });

  it("returns null when there is no dated treatment event", () => {
    expect(buildTreatmentView([], [])).toBeNull();
    expect(buildTreatmentView([event("d", "Diagnosis", "2026-04-10")], [])).toBeNull();
  });

  it("can be laid out by the same layout as the Diagnosis view", () => {
    const layout = layoutPhaseView(buildTreatmentView(journey, encounters)!);

    expect(layout.lanes[0].lane.id).toBe("treatment");
    expect(layout.connectors.filter((c) => c.hasLine).length).toBe(2);
    expect(layout.height).toBeGreaterThan(0);
  });

  it("does not change the events or encounters it is given", () => {
    const before = JSON.stringify({ journey, encounters });
    buildTreatmentView(journey, encounters);

    expect(JSON.stringify({ journey, encounters })).toBe(before);
  });
});

describe("buildTreatmentView: compact labels", () => {
  const events = [
    event("diagnosis", "Diagnosis", "2026-04-10"),
    event("start", "Treatment_Start", "2026-05-01"),
    event("d1", "Treatment_Delivery", "2026-05-01", { treatmentName: "EV", treatmentCycle: 1 }),
    event("d2", "Treatment_Delivery", "2026-05-08", { treatmentName: "Pembrolizumab", treatmentCycle: 1 }),
    event("d3", "Treatment_Delivery", "2026-05-15", { treatmentName: "EV", treatmentCycle: 1, treatmentDeliveryStatus: "Held" }),
    event("rt", "Treatment_Delivery", "2026-06-01", { treatmentName: "IMRT", treatmentDose: 2, treatmentDoseUnits: "Gy" }),
  ];

  it("gives each event a short label and keeps the full type name separately", () => {
    const view = buildTreatmentView(events, [])!;
    const byUid = Object.fromEntries(view.lanes.flatMap((lane) => lane.events).map((e) => [e.event.uid, e]));

    expect(byUid.d1.label).toBe("EV C1");
    expect(byUid.d2.label).toBe("pembro C1");
    expect(byUid.rt.label).toBe("2 Gy");
    expect(byUid.start.label).toBe("Treatment Start");
    expect(byUid.d1.presentation.label).toBe("Treatment Delivery");
  });

  it("marks only the dose recorded as not fully given as hollow", () => {
    const view = buildTreatmentView(events, [])!;
    const hollow = view.lanes.flatMap((lane) => lane.events).filter((e) => e.hollow).map((e) => e.event.uid);

    expect(hollow).toEqual(["d3"]);
  });

  it("lists the abbreviations its labels use", () => {
    expect(buildTreatmentView(events, [])!.legend).toEqual([
      { short: "EV", full: "Enfortumab vedotin" },
      { short: "pembro", full: "Pembrolizumab" },
    ]);
  });

  it("packs the short delivery labels tighter than the generic label would allow", () => {
    const layout = layoutPhaseView(buildTreatmentView(events, [])!);
    const treatment = layout.lanes.find((lane) => lane.lane.id === "treatment")!;

    // Weekly deliveries labelled "EV C1" and "pembro C1" need fewer rows than four "Treatment Delivery" labels would.
    expect(Math.max(...treatment.events.map((item) => item.row))).toBeLessThanOrEqual(1);
  });
});
