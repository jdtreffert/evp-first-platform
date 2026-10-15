import { describe, expect, it } from "vitest";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { selectDiagnosisPhase } from "../diagnosisPhase";
import { TREATMENT_COMPLETED, selectTreatmentPhase } from "../treatmentPhase";

function event(uid: string, eventType: string, eventDate: string | null, extra: Partial<UnifiedEvent> = {}): UnifiedEvent {
  return { uid, masterId: "M1", eventType, eventDate, payload: { id: uid, fields: {} }, ...extra };
}

const completed = (uid: string, date: string) => event(uid, "Treatment_Change", date, { treatmentChangeType: TREATMENT_COMPLETED });
const uids = (events: UnifiedEvent[]) => events.map((e) => e.uid);

/** A first-line course shaped like the reference one, from work-up to completed treatment and surveillance. */
const journey = [
  event("symptom", "Symptom", "2026-02-01"),
  event("path", "Pathology", "2026-03-20"),
  event("diagnosis", "Diagnosis", "2026-04-10"),
  event("decision", "Decision", "2026-04-20"),
  event("baseline-scan", "Imaging", "2026-04-25"),
  event("start", "Treatment_Start", "2026-05-01"),
  event("delivery-1", "Treatment_Delivery", "2026-05-10"),
  event("lab-1", "Lab", "2026-05-10"),
  event("response-1", "Treatment_Response", "2026-06-15"),
  event("change", "Treatment_Change", "2026-06-20", { treatmentChangeType: "Dose reduction" }),
  event("delivery-2", "Treatment_Delivery", "2026-07-01"),
  completed("done", "2026-08-01"),
  event("late-response", "Treatment_Response", "2026-08-20"),
  event("follow-up-scan", "Imaging", "2026-09-15"),
];

describe("selectTreatmentPhase", () => {
  it("holds the treatment events and the other events after the Diagnosis, up to the completion", () => {
    const phase = selectTreatmentPhase(journey)!;

    expect(uids(phase.events)).toEqual([
      "decision", "baseline-scan", "start", "delivery-1", "lab-1", "response-1", "change", "delivery-2", "done", "late-response",
    ]);
    expect(phase.diagnosis?.uid).toBe("diagnosis");
    expect(phase.completion?.uid).toBe("done");
    expect(phase.ongoing).toBe(false);
  });

  it("keeps a treatment response dated after the completion, and leaves later events to Surveillance", () => {
    const all = uids(selectTreatmentPhase(journey)!.events);

    expect(all).toContain("late-response");
    expect(all).not.toContain("follow-up-scan");
  });

  it("leaves out the work-up that the Diagnosis phase holds", () => {
    const all = uids(selectTreatmentPhase(journey)!.events);

    for (const uid of ["symptom", "path", "diagnosis"]) expect(all).not.toContain(uid);
  });

  it("is ongoing, and open-ended, when no completion is recorded", () => {
    const withoutCompletion = journey.filter((e) => e.uid !== "done");
    const phase = selectTreatmentPhase(withoutCompletion)!;

    expect(phase.ongoing).toBe(true);
    expect(phase.completion).toBeNull();
    expect(uids(phase.events)).toContain("follow-up-scan");
  });

  it("treats the latest completion as the end, and ignores a completion that treatment carried on past", () => {
    const earlyCompletion = completed("early-done", "2026-06-01");
    // Deliveries continue after the first completion, so treatment was not over.
    expect(selectTreatmentPhase([...journey.filter((e) => e.uid !== "done"), earlyCompletion])!.ongoing).toBe(true);
    // A later completion ends it.
    const phase = selectTreatmentPhase([...journey, earlyCompletion])!;
    expect(phase.completion?.uid).toBe("done");
    expect(phase.ongoing).toBe(false);
  });

  it("is not re-opened by a delivery on the same day as the completion", () => {
    const phase = selectTreatmentPhase([...journey, event("final-delivery", "Treatment_Delivery", "2026-08-01")])!;

    expect(phase.completion?.uid).toBe("done");
    expect(uids(phase.events)).toContain("final-delivery");
  });

  it("is re-opened by a dose change dated after the completion", () => {
    const phase = selectTreatmentPhase([...journey, event("late-change", "Treatment_Change", "2026-08-05", { treatmentChangeType: "Hold" })])!;
    expect(phase.ongoing).toBe(true);
  });

  it("includes treatment events dated before the Diagnosis, which the Diagnosis phase leaves out", () => {
    const phase = selectTreatmentPhase([...journey, event("prior-bcg", "Treatment_Delivery", "2025-06-01")])!;
    expect(uids(phase.events)[0]).toBe("prior-bcg");
  });

  it("starts at the first treatment event when no Diagnosis is recorded", () => {
    const noDiagnosis = journey.filter((e) => e.uid !== "diagnosis");
    const phase = selectTreatmentPhase(noDiagnosis)!;

    expect(phase.diagnosis).toBeNull();
    expect(uids(phase.events)).toEqual(["start", "delivery-1", "lab-1", "response-1", "change", "delivery-2", "done", "late-response"]);
  });

  it("returns null when there is no dated treatment event", () => {
    expect(selectTreatmentPhase([])).toBeNull();
    expect(selectTreatmentPhase(journey.filter((e) => !e.eventType.startsWith("Treatment_")))).toBeNull();
    expect(selectTreatmentPhase([event("start", "Treatment_Start", null), event("d", "Diagnosis", "2026-04-10")])).toBeNull();
  });

  it("never places undated events in the phase, but keeps them available", () => {
    const phase = selectTreatmentPhase([...journey, event("unknown-date", "Lab", null)])!;

    expect(uids(phase.undated)).toEqual(["unknown-date"]);
    expect(uids(phase.events)).not.toContain("unknown-date");
  });

  it("uses the Diagnosis the caller chose", () => {
    const events = [...journey, event("restaging", "Diagnosis", "2026-05-05")];
    const phase = selectTreatmentPhase(events, { diagnosisUid: "restaging" })!;

    expect(phase.diagnosis?.uid).toBe("restaging");
    expect(uids(phase.events)).not.toContain("decision");
    expect(uids(phase.events)).toContain("delivery-1");
  });

  it("does not need recorded relationships, and does not change what it is given", () => {
    const before = JSON.stringify(journey);
    const withLinks = journey.map((e) => (e.uid === "response-1" ? { ...e, relatedEventUid: "baseline-scan", eventRelationship: "Assessed_By" } : e));

    expect(uids(selectTreatmentPhase(withLinks)!.events)).toEqual(uids(selectTreatmentPhase(journey)!.events));
    selectTreatmentPhase(journey);
    expect(JSON.stringify(journey)).toBe(before);
  });
});

describe("the Diagnosis and Treatment phases together", () => {
  it("never share an event, and between them hold every dated event up to the end of treatment", () => {
    const diagnosis = uids(selectDiagnosisPhase(journey)!.events);
    const treatment = uids(selectTreatmentPhase(journey)!.events);

    expect(diagnosis.filter((uid) => treatment.includes(uid))).toEqual([]);
    // Only what follows the completion is in neither: it belongs to Surveillance.
    const inNeither = journey.map((e) => e.uid).filter((uid) => !diagnosis.includes(uid) && !treatment.includes(uid));
    expect(inNeither).toEqual(["follow-up-scan"]);
  });

  it("still partition when treatment came before the Diagnosis and no completion is recorded", () => {
    const events = [
      event("prior", "Treatment_Delivery", "2025-06-01"),
      event("symptom", "Symptom", "2026-02-01"),
      event("diagnosis", "Diagnosis", "2026-04-10"),
      event("scan", "Imaging", "2026-05-01"),
      event("start", "Treatment_Start", "2026-05-05"),
    ];
    const diagnosis = uids(selectDiagnosisPhase(events)!.events);
    const treatment = uids(selectTreatmentPhase(events)!.events);

    expect(diagnosis.filter((uid) => treatment.includes(uid))).toEqual([]);
    expect([...diagnosis, ...treatment].sort()).toEqual(events.map((e) => e.uid).sort());
  });
});
