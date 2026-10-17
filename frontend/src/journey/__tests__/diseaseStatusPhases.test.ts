import { describe, expect, it } from "vitest";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { selectDiagnosisPhase } from "../diagnosisPhase";
import { buildSurveillanceView } from "../surveillanceView";
import { selectSurveillancePhase } from "../surveillancePhase";
import { TREATMENT_COMPLETED, selectTreatmentPhase } from "../treatmentPhase";

function event(uid: string, eventType: string, eventDate: string, extra: Partial<UnifiedEvent> = {}): UnifiedEvent {
  return { uid, masterId: "M1", eventType, eventDate, payload: { id: uid, fields: {} }, ...extra };
}

const status = (uid: string, eventDate: string, category: string) =>
  event(uid, "Disease_Status", eventDate, { diseaseStatusCategory: category });

const journey = [
  event("diagnosis", "Diagnosis", "2026-04-10"),
  event("start", "Treatment_Start", "2026-05-01"),
  event("done", "Treatment_Change", "2026-08-01", { treatmentChangeType: TREATMENT_COMPLETED }),
  event("scan", "Imaging", "2026-09-15"),
];

const withStatuses = [
  ...journey,
  status("ned-before", "2026-03-01", "No evidence of disease"),
  status("ned-during", "2026-06-15", "No evidence of disease"),
  status("ned-on-completion", "2026-08-01", "No evidence of disease"),
  status("suspicious-after", "2026-10-01", "Indeterminate or suspicious"),
  status("present-after", "2026-11-01", "Disease present"),
];

const uids = (events: readonly UnifiedEvent[]) => events.map((e) => e.uid);

describe("Disease_Status and the phases", () => {
  it("does not move the Diagnosis, Treatment or completion boundaries", () => {
    const before = { diagnosis: selectDiagnosisPhase(journey), treatment: selectTreatmentPhase(journey) };
    const after = { diagnosis: selectDiagnosisPhase(withStatuses), treatment: selectTreatmentPhase(withStatuses) };

    expect(after.diagnosis?.diagnosis.uid).toBe(before.diagnosis?.diagnosis.uid);
    expect(after.treatment?.diagnosis?.uid).toBe(before.treatment?.diagnosis?.uid);
    expect(after.treatment?.completion?.uid).toBe("done");
    expect(after.treatment?.ongoing).toBe(false);
  });

  it("places each status in the phase its own date falls in, whatever its category", () => {
    const diagnosis = uids(selectDiagnosisPhase(withStatuses)!.events);
    const treatment = uids(selectTreatmentPhase(withStatuses)!.events);
    const surveillance = selectSurveillancePhase(withStatuses);
    if (surveillance.status !== "ready") throw new Error("expected a ready phase");
    const later = uids(surveillance.events);

    expect(diagnosis).toContain("ned-before");
    // Dated after the Diagnosis and on or before the completion day: the Treatment phase, even on the completion day.
    expect(treatment).toEqual(expect.arrayContaining(["ned-during", "ned-on-completion"]));
    // Dated after the completion: Post-treatment Surveillance, and only because of the date.
    expect(later).toEqual(expect.arrayContaining(["suspicious-after", "present-after"]));
    expect(later).not.toContain("ned-before");
    expect(later).not.toContain("ned-during");
  });

  it("keeps the three phases from sharing an event while holding every dated event", () => {
    const diagnosis = uids(selectDiagnosisPhase(withStatuses)!.events);
    const treatment = uids(selectTreatmentPhase(withStatuses)!.events);
    const surveillance = selectSurveillancePhase(withStatuses);
    if (surveillance.status !== "ready") throw new Error("expected a ready phase");
    const later = uids(surveillance.events);

    expect(diagnosis.filter((uid) => treatment.includes(uid) || later.includes(uid))).toEqual([]);
    expect(treatment.filter((uid) => later.includes(uid))).toEqual([]);
    expect([...diagnosis, ...treatment, ...later].sort()).toEqual(uids(withStatuses).sort());
  });

  it("does not put a status in Post-treatment Surveillance because its category is no evidence of disease", () => {
    const surveillance = selectSurveillancePhase(withStatuses);
    if (surveillance.status !== "ready") throw new Error("expected a ready phase");

    expect(uids(surveillance.events)).not.toContain("ned-during");
    expect(uids(surveillance.events)).not.toContain("ned-before");
  });

  it("does not create a Post-treatment Surveillance phase, end treatment or start one, by itself", () => {
    const ongoing = [event("diagnosis", "Diagnosis", "2026-04-10"), event("start", "Treatment_Start", "2026-05-01"), status("ned", "2026-09-01", "No evidence of disease")];

    expect(selectSurveillancePhase(ongoing)).toEqual({ status: "treatment-ongoing" });
    expect(selectTreatmentPhase(ongoing)?.completion).toBeNull();
  });

  it("is not read as a complete response, a Recurrence or a Progression by the surveillance view", () => {
    const result = buildSurveillanceView(withStatuses, []);
    if (result.status !== "ready") throw new Error("expected a ready view");

    expect(result.view.completeResponse).toBeNull();
    expect(result.view.firstDiseaseEvent).toBeNull();
  });
});

describe("Disease_Status in the surveillance view", () => {
  it("reports the latest recorded status over the whole record, with the newer evidence observation", () => {
    const events = [...journey, status("ds", "2026-09-01", "No evidence of disease"), event("later-scan", "Imaging", "2026-10-20")];
    const result = buildSurveillanceView(events, []);
    if (result.status !== "ready") throw new Error("expected a ready view");

    expect(result.view.diseaseStatus).toMatchObject({ status: "recorded", day: "2026-09-01", category: "No evidence of disease" });
    expect(result.view.diseaseStatus.status === "recorded" && result.view.diseaseStatus.newerEvidence.map((e) => e.uid)).toEqual(["scan", "later-scan"]);
  });

  it("reports not recorded, never no evidence of disease, when a complete response is recorded without a status", () => {
    const events = [...journey, event("response", "Treatment_Response", "2026-08-20", { treatmentResponseCategory: "CR" })];
    const result = buildSurveillanceView(events, []);
    if (result.status !== "ready") throw new Error("expected a ready view");

    expect(result.view.diseaseStatus.status).toBe("not-recorded");
  });

  it("draws the status as a milestone in Decisions & Milestones, labelled by its category", () => {
    const events = [...journey, status("ds", "2026-09-01", "Indeterminate or suspicious")];
    const result = buildSurveillanceView(events, []);
    if (result.status !== "ready") throw new Error("expected a ready view");

    const lane = result.view.lanes.find((l) => l.lane.id === "decisions-milestones");
    expect(lane?.events.map((e) => [e.event.uid, e.label, e.presentation.milestone, e.presentation.marker])).toEqual([
      ["ds", "Indeterminate or suspicious", true, "assessment"],
    ]);
  });
});
