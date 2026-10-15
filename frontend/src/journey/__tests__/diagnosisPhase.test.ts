import { describe, expect, it } from "vitest";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { isTreatmentEvent, selectDiagnosisPhase } from "../diagnosisPhase";

function event(uid: string, eventType: string, eventDate: string | null): UnifiedEvent {
  return { uid, masterId: "M1", eventType, eventDate, payload: { id: uid, fields: {} } };
}

const uids = (events: UnifiedEvent[]) => events.map((e) => e.uid);

describe("selectDiagnosisPhase", () => {
  const journey = [
    event("treatment-start", "Treatment_Start", "2026-05-01"),
    event("decision", "Decision", "2026-04-20"),
    event("diagnosis", "Diagnosis", "2026-04-10"),
    event("imaging-2", "Imaging", "2026-04-05"),
    event("pathology", "Pathology", "2026-03-20"),
    event("turbt", "TURBT", "2026-03-10"),
    event("cystoscopy", "Cystoscopy", "2026-03-01"),
    event("imaging-1", "Imaging", "2026-02-15"),
    event("symptom", "Symptom", "2026-02-01"),
  ];

  it("includes every event up to the Diagnosis date, earliest first, and nothing after it", () => {
    const phase = selectDiagnosisPhase(journey);

    expect(phase?.diagnosis.uid).toBe("diagnosis");
    expect(uids(phase!.events)).toEqual([
      "symptom", "imaging-1", "cystoscopy", "turbt", "pathology", "imaging-2", "diagnosis",
    ]);
  });

  it("includes events on the Diagnosis date but not the day after", () => {
    const phase = selectDiagnosisPhase([
      event("d", "Diagnosis", "2026-04-10"),
      event("same-day", "Pathology", "2026-04-10"),
      event("next-day", "Imaging", "2026-04-11"),
    ]);

    expect(uids(phase!.events)).toEqual(["d", "same-day"]);
  });

  it("compares calendar dates and ignores any time of day", () => {
    const phase = selectDiagnosisPhase([
      event("d", "Diagnosis", "2026-04-10T08:00:00Z"),
      event("late", "Imaging", "2026-04-10T23:30:00Z"),
    ]);

    expect(uids(phase!.events)).toEqual(["d", "late"]);
  });

  it("excludes treatment events even when they are dated before the Diagnosis", () => {
    const phase = selectDiagnosisPhase([
      event("d", "Diagnosis", "2026-04-10"),
      event("start", "Treatment_Start", "2026-01-01"),
      event("delivery", "Treatment_Delivery", "2026-01-02"),
      event("change", "Treatment_Change", "2026-01-03"),
      event("response", "Treatment_Response", "2026-01-04"),
      event("note", "Note", "2026-01-05"),
    ]);

    expect(uids(phase!.events)).toEqual(["note", "d"]);
  });

  it("returns null when there is no dated Diagnosis event", () => {
    expect(selectDiagnosisPhase([])).toBeNull();
    expect(selectDiagnosisPhase([event("i", "Imaging", "2026-01-01")])).toBeNull();
    expect(selectDiagnosisPhase([event("d", "Diagnosis", null), event("i", "Imaging", "2026-01-01")])).toBeNull();
  });

  it("never places undated events in the phase, but keeps them available", () => {
    const phase = selectDiagnosisPhase([
      event("d", "Diagnosis", "2026-04-10"),
      event("unknown-date", "Imaging", null),
      event("bad-date", "Symptom", "not a date"),
    ]);

    expect(uids(phase!.events)).toEqual(["d"]);
    expect(uids(phase!.undated)).toEqual(["bad-date", "unknown-date"]);
  });

  describe("with several Diagnosis events", () => {
    const events = [
      event("restaging", "Diagnosis", "2026-09-01"),
      event("initial", "Diagnosis", "2026-04-10"),
      event("scan", "Imaging", "2026-07-01"),
      event("early", "Symptom", "2026-03-01"),
    ];

    it("defaults to the earliest and lists every candidate earliest first", () => {
      const phase = selectDiagnosisPhase(events);

      expect(phase?.diagnosis.uid).toBe("initial");
      expect(uids(phase!.diagnosisCandidates)).toEqual(["initial", "restaging"]);
      expect(uids(phase!.events)).toEqual(["early", "initial"]);
    });

    it("can be built around a chosen Diagnosis event", () => {
      const phase = selectDiagnosisPhase(events, { diagnosisUid: "restaging" });

      expect(phase?.diagnosis.uid).toBe("restaging");
      expect(uids(phase!.events)).toEqual(["early", "initial", "scan", "restaging"]);
    });

    it("falls back to the earliest when the chosen event is not a dated Diagnosis", () => {
      expect(selectDiagnosisPhase(events, { diagnosisUid: "scan" })?.diagnosis.uid).toBe("initial");
      expect(selectDiagnosisPhase(events, { diagnosisUid: "missing" })?.diagnosis.uid).toBe("initial");
    });

    it("breaks a date tie by uid so the result is stable", () => {
      const tied = [event("b", "Diagnosis", "2026-04-10"), event("a", "Diagnosis", "2026-04-10")];
      expect(selectDiagnosisPhase(tied)?.diagnosis.uid).toBe("a");
    });
  });

  it("does not need recorded relationships", () => {
    const linked = { ...event("p", "Pathology", "2026-03-20"), relatedEventUid: "turbt", eventRelationship: "Derived_From" };
    const withLinks = selectDiagnosisPhase([event("d", "Diagnosis", "2026-04-10"), linked, event("turbt", "TURBT", "2026-03-10")]);
    const withoutLinks = selectDiagnosisPhase([event("d", "Diagnosis", "2026-04-10"), event("p", "Pathology", "2026-03-20"), event("turbt", "TURBT", "2026-03-10")]);

    expect(uids(withLinks!.events)).toEqual(uids(withoutLinks!.events));
  });

  it("does not change the events it is given", () => {
    const input = [event("d", "Diagnosis", "2026-04-10"), event("a", "Imaging", "2026-01-01")];
    const before = JSON.stringify(input);
    selectDiagnosisPhase(input);

    expect(JSON.stringify(input)).toBe(before);
  });
});

describe("isTreatmentEvent", () => {
  it("is true for the Treatment event types and false for the rest", () => {
    for (const type of ["Treatment_Start", "Treatment_Delivery", "Treatment_Change", "Treatment_Response"]) {
      expect(isTreatmentEvent(event("x", type, "2026-01-01"))).toBe(true);
    }
    for (const type of ["Diagnosis", "Decision", "Imaging_Response", "Procedure", "Recurrence"]) {
      expect(isTreatmentEvent(event("x", type, "2026-01-01"))).toBe(false);
    }
  });
});
