import { describe, expect, it } from "vitest";
import type { Encounter } from "../../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { layoutPhaseView } from "../phaseLayout";
import { buildSurveillanceView } from "../surveillanceView";
import type { SurveillanceView } from "../surveillanceView";
import { TREATMENT_COMPLETED } from "../treatmentPhase";

function event(uid: string, eventType: string, eventDate: string | null, extra: Partial<UnifiedEvent> = {}): UnifiedEvent {
  return { uid, masterId: "M1", eventType, eventDate, payload: { id: uid, fields: {} }, ...extra };
}

function encounter(uid: string, encounterDate: string): Encounter {
  return { uid, masterId: "M1", encounterDate, payload: { id: uid, fields: {} } };
}

const baseJourney = [
  event("diagnosis", "Diagnosis", "2026-04-10"),
  event("start", "Treatment_Start", "2026-05-01"),
  event("done", "Treatment_Change", "2026-08-01", { treatmentChangeType: TREATMENT_COMPLETED }),
  event("scan-1", "Imaging", "2026-09-15", { encounterUid: "visit-1" }),
  event("ctdna-1", "ctDNA", "2026-09-15", { encounterUid: "visit-1" }),
  event("lab-1", "Lab", "2026-09-15", { encounterUid: "visit-1" }),
  event("symptom", "Symptom", "2026-10-20"),
  event("cysto", "Cystoscopy", "2026-12-01"),
];
const visit = encounter("visit-1", "2026-09-15");

function ready(events: UnifiedEvent[], encounters: Encounter[] = []): SurveillanceView {
  const result = buildSurveillanceView(events, encounters);
  if (result.status !== "ready") throw new Error(`expected a ready view, got ${result.status}`);
  return result.view;
}

const laneShape = (view: SurveillanceView) =>
  Object.fromEntries(view.lanes.map((lane) => [lane.lane.label, lane.events.map((e) => e.event.uid)]));

describe("buildSurveillanceView", () => {
  it("lays the events after the completion out in lanes, earliest first, with only the lanes that have events", () => {
    const view = ready(baseJourney);

    expect(laneShape(view)).toEqual({
      "Symptoms & Experience": ["symptom"],
      // Same-date events are ordered by uid.
      Investigations: ["ctdna-1", "lab-1", "scan-1", "cysto"],
    });
  });

  it("marks the completion on the axis, which begins at it", () => {
    const view = ready(baseJourney);

    expect(view.references).toEqual([{ day: "2026-08-01", label: "Treatment completed" }]);
    expect(view.range).toEqual({ start: "2026-08-01", end: "2026-12-01" });
    expect(view.completion.event.uid).toBe("done");
    expect(view.lanes.flatMap((l) => l.events).map((e) => e.event.uid)).not.toContain("done");
  });

  it("reports the latest event and the days since the completion, from recorded dates only", () => {
    const view = ready(baseJourney);

    expect(view.latest.event.uid).toBe("cysto");
    expect(view.daysToLatest).toBe(122);
  });

  it("says no Progression or Recurrence is recorded when there is none, without claiming more", () => {
    const view = ready(baseJourney);

    expect(view.firstDiseaseEvent).toBeNull();
    expect(view.daysToFirstDiseaseEvent).toBeNull();
  });

  it("finds the first Progression or Recurrence recorded, and draws them as milestones", () => {
    const view = ready([
      ...baseJourney,
      event("recurrence", "Recurrence", "2027-01-10"),
      event("progression", "Progression", "2027-03-01"),
    ]);

    expect(view.firstDiseaseEvent?.event.uid).toBe("recurrence");
    expect(view.daysToFirstDiseaseEvent).toBe(162);
    const milestones = view.lanes.flatMap((l) => l.events).filter((e) => e.presentation.milestone).map((e) => e.event.uid);
    expect(milestones).toEqual(["recurrence", "progression"]);
    expect(view.lanes[0].lane.id).toBe("response-disease-status");
  });

  it("joins a surveillance visit's events across lanes with a line at the visit date", () => {
    const view = ready(baseJourney, [visit]);

    expect(view.encounters).toHaveLength(1);
    expect(view.encounters[0].members.map((m) => m.event.uid)).toEqual(["ctdna-1", "lab-1", "scan-1"]);
    expect(view.encounters[0].crossLane).toBe(false);
  });

  it("counts an encounter's events that fall outside the phase, such as ones on the completion day", () => {
    const view = ready(
      [...baseJourney, event("completion-day-lab", "Lab", "2026-08-01", { encounterUid: "visit-1" })],
      [visit],
    );

    expect(view.encounters[0].outsideCount).toBe(1);
  });

  it("explains why there is no view yet", () => {
    expect(buildSurveillanceView([], [])).toEqual({ status: "no-treatment" });
    expect(buildSurveillanceView(baseJourney.filter((e) => e.uid !== "done"), [])).toEqual({ status: "treatment-ongoing" });
    expect(buildSurveillanceView(baseJourney.filter((e) => ["diagnosis", "start", "done"].includes(e.uid)), [])).toEqual({
      status: "no-events-yet",
      completionDay: "2026-08-01",
    });
  });

  it("reports undated events without placing them", () => {
    const view = ready([...baseJourney, event("unknown-date", "Lab", null)]);

    expect(view.undated.map((e) => e.uid)).toEqual(["unknown-date"]);
  });

  it("can be laid out by the shared layout, with the completion marked", () => {
    const layout = layoutPhaseView(ready(baseJourney));

    expect(layout.references).toHaveLength(1);
    expect(layout.references[0].label).toBe("Treatment completed");
    // The completion is the earliest date drawn, so its line is at the left edge of the dated area.
    expect(layout.references[0].x).toBe(Math.min(...layout.lanes.flatMap((l) => l.events).map((e) => e.x), layout.references[0].x));
  });

  it("does not change the events or encounters it is given", () => {
    const before = JSON.stringify({ baseJourney, visit });
    buildSurveillanceView(baseJourney, [visit]);

    expect(JSON.stringify({ baseJourney, visit })).toBe(before);
  });
});
