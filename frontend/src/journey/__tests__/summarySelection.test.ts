import { describe, expect, it } from "vitest";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { SUMMARY_EVENT_TYPES, isSummaryEvent, selectSummaryAnchors, selectSummaryEvents } from "../summarySelection";
import { TREATMENT_COMPLETED, selectTreatmentStart } from "../treatmentPhase";

function event(uid: string, eventType: string, eventDate: string | null, extra: Partial<UnifiedEvent> = {}): UnifiedEvent {
  return { uid, masterId: "M1", eventType, eventDate, payload: { id: uid, fields: {} }, ...extra };
}

const completed = (uid: string, eventDate: string | null) => event(uid, "Treatment_Change", eventDate, { treatmentChangeType: TREATMENT_COMPLETED });
const crDecision = (uid: string, eventDate: string | null) => event(uid, "Decision", eventDate, { decisionType: "Complete response confirmed" });

describe("which events the Summary includes", () => {
  it("includes exactly the specified types and the confirmed complete response decision", () => {
    expect([...SUMMARY_EVENT_TYPES].sort()).toEqual(["Diagnosis", "Disease_Status", "Progression", "Recurrence", "Treatment_Change", "Treatment_Start"]);
    for (const type of SUMMARY_EVENT_TYPES) expect(isSummaryEvent(event("e", type, "2026-01-01"))).toBe(true);
    expect(isSummaryEvent(crDecision("d", "2026-01-01"))).toBe(true);
  });

  it.each([
    "Treatment_Delivery", "Imaging", "Imaging_Response", "Cystoscopy", "Cystoscopy_Biopsy", "Cytology", "Pathology", "Lab",
    "ctDNA", "utDNA", "Symptom", "QoL", "Procedure", "Note", "Somatic", "Germline", "TURBT", "Treatment_Response",
  ])("does not include %s", (type) => {
    expect(isSummaryEvent(event("e", type, "2026-01-01"))).toBe(false);
  });

  it("does not include any other Decision, nor a different event type carrying the confirming value", () => {
    for (const decisionType of ["Hold treatment", "Elect bladder preservation", "Other", "complete response confirmed", "", null, undefined]) {
      expect(isSummaryEvent(event("d", "Decision", "2026-01-01", { decisionType }))).toBe(false);
    }
    expect(isSummaryEvent(event("n", "Note", "2026-01-01", { decisionType: "Complete response confirmed" }))).toBe(false);
  });
});

describe("selectSummaryEvents", () => {
  it("returns the Summary events earliest first, with same-date events in uid order, and leaves the rest out", () => {
    const { milestones, undated } = selectSummaryEvents([
      event("scan", "Imaging", "2026-02-01"),
      event("recurrence", "Recurrence", "2026-09-01"),
      event("b", "Disease_Status", "2026-05-01"),
      event("a", "Disease_Status", "2026-05-01"),
      event("diagnosis", "Diagnosis", "2026-01-10"),
      event("delivery", "Treatment_Delivery", "2026-03-01"),
    ]);

    expect(milestones.map((e) => e.uid)).toEqual(["diagnosis", "a", "b", "recurrence"]);
    expect(undated).toEqual([]);
  });

  it("does not place events with a missing or invalid date, and reports them", () => {
    const { milestones, undated } = selectSummaryEvents([
      event("diagnosis", "Diagnosis", "2026-01-10"),
      event("no-date", "Treatment_Start", null),
      event("bad-date", "Recurrence", "not-a-date"),
      event("scan", "Imaging", null),
    ]);

    expect(milestones.map((e) => e.uid)).toEqual(["diagnosis"]);
    expect(undated.map((e) => e.uid)).toEqual(["bad-date", "no-date"]);
  });

  it("ignores withdrawn events", () => {
    const { milestones } = selectSummaryEvents([event("w", "Diagnosis", "2026-01-10", { withdrawnAt: "2026-02-01T00:00:00Z" })]);
    expect(milestones).toEqual([]);
  });

  it("does not mutate what it is given", () => {
    const events = [event("b", "Recurrence", "2026-09-01"), event("a", "Diagnosis", "2026-01-10")];
    const before = JSON.stringify(events);
    selectSummaryEvents(events);
    expect(JSON.stringify(events)).toBe(before);
  });
});

describe("selectTreatmentStart", () => {
  it("is the earliest dated Treatment_Start, ties going to the lower uid, never inferred from a delivery", () => {
    expect(selectTreatmentStart([event("late", "Treatment_Start", "2026-06-01"), event("b", "Treatment_Start", "2026-05-01"), event("a", "Treatment_Start", "2026-05-01")])?.uid).toBe("a");
    expect(selectTreatmentStart([event("d", "Treatment_Delivery", "2026-05-01")])).toBeNull();
    expect(selectTreatmentStart([event("undated", "Treatment_Start", null)])).toBeNull();
  });
});

describe("selectSummaryAnchors", () => {
  const journey = [
    event("diagnosis", "Diagnosis", "2026-04-10"),
    event("start", "Treatment_Start", "2026-05-01"),
    event("delivery", "Treatment_Delivery", "2026-05-08"),
    completed("done", "2026-08-01"),
  ];

  it("finds the Diagnosis, the Treatment Start and the Treatment completed by the existing selection", () => {
    const anchors = selectSummaryAnchors(journey);

    expect(anchors.diagnosis).toMatchObject({ status: "present" });
    expect(anchors.diagnosis.status === "present" && anchors.diagnosis.event.uid).toBe("diagnosis");
    expect(anchors.treatmentStart.status === "present" && anchors.treatmentStart.event.uid).toBe("start");
    expect(anchors.treatmentCompletion.status === "present" && anchors.treatmentCompletion.event.uid).toBe("done");
  });

  it("uses the earliest Diagnosis by default and the one chosen by uid when asked", () => {
    const events = [...journey, event("second", "Diagnosis", "2026-06-01")];
    expect(selectSummaryAnchors(events).diagnosis.status === "present" && (selectSummaryAnchors(events).diagnosis as { event: UnifiedEvent }).event.uid).toBe("diagnosis");
    expect((selectSummaryAnchors(events, { diagnosisUid: "second" }).diagnosis as { event: UnifiedEvent }).event.uid).toBe("second");
  });

  it("is unavailable, with no event, when there is none of that kind", () => {
    expect(selectSummaryAnchors([])).toEqual({
      diagnosis: { status: "unavailable", reason: "no-event" },
      treatmentStart: { status: "unavailable", reason: "no-event" },
      treatmentCompletion: { status: "unavailable", reason: "no-event" },
    });
  });

  it("is unavailable, with the reason, when the event has no valid date, and no other event is used instead", () => {
    const anchors = selectSummaryAnchors([
      event("diagnosis", "Diagnosis", null),
      event("start", "Treatment_Start", "not-a-date"),
      completed("done", null),
      event("delivery", "Treatment_Delivery", "2026-05-08"),
      event("ds", "Disease_Status", "2026-09-01", { diseaseStatusCategory: "No evidence of disease" }),
      crDecision("cr", "2026-09-02"),
      event("scan", "Imaging", "2026-09-15"),
    ]);

    expect(anchors.diagnosis).toEqual({ status: "unavailable", reason: "undated-event" });
    expect(anchors.treatmentStart).toEqual({ status: "unavailable", reason: "undated-event" });
    expect(anchors.treatmentCompletion).toEqual({ status: "unavailable", reason: "undated-event" });
  });

  it("does not take a start from the first delivery, or a completion from a status, a confirmed complete response or later events", () => {
    const anchors = selectSummaryAnchors([
      event("diagnosis", "Diagnosis", "2026-04-10"),
      event("delivery", "Treatment_Delivery", "2026-05-08"),
      event("ds", "Disease_Status", "2026-09-01", { diseaseStatusCategory: "No evidence of disease" }),
      crDecision("cr", "2026-09-02"),
      event("scan", "Imaging", "2026-09-15"),
    ]);

    expect(anchors.treatmentStart).toEqual({ status: "unavailable", reason: "no-event" });
    expect(anchors.treatmentCompletion).toEqual({ status: "unavailable", reason: "no-event" });
  });

  it("does not take the date of an encounter as an anchor", () => {
    const anchors = selectSummaryAnchors([event("diagnosis", "Diagnosis", "2026-04-10", { encounterUid: "visit" })]);
    expect(anchors.diagnosis.status === "present" && anchors.diagnosis.event.eventDate).toBe("2026-04-10");
  });

  it("treats a completion followed by more treatment as not available, since treatment was recorded as continuing", () => {
    const anchors = selectSummaryAnchors([...journey, event("resume", "Treatment_Delivery", "2026-09-01")]);
    expect(anchors.treatmentCompletion).toEqual({ status: "unavailable", reason: "treatment-continued" });
  });

  it("ignores a withdrawn anchor", () => {
    const anchors = selectSummaryAnchors([event("diagnosis", "Diagnosis", "2026-04-10", { withdrawnAt: "2026-05-01T00:00:00Z" })]);
    expect(anchors.diagnosis).toEqual({ status: "unavailable", reason: "no-event" });
  });
});
