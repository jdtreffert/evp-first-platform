import { describe, expect, it } from "vitest";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { daysBetween } from "../calendarDay";
import { selectDiagnosisPhase } from "../diagnosisPhase";
import { selectSurveillancePhase } from "../surveillancePhase";
import { TREATMENT_COMPLETED, selectTreatmentPhase } from "../treatmentPhase";

function event(uid: string, eventType: string, eventDate: string | null, extra: Partial<UnifiedEvent> = {}): UnifiedEvent {
  return { uid, masterId: "M1", eventType, eventDate, payload: { id: uid, fields: {} }, ...extra };
}

const completed = (uid: string, date: string) => event(uid, "Treatment_Change", date, { treatmentChangeType: TREATMENT_COMPLETED });
const uids = (events: UnifiedEvent[]) => events.map((e) => e.uid);

const journey = [
  event("symptom", "Symptom", "2026-02-01"),
  event("diagnosis", "Diagnosis", "2026-04-10"),
  event("decision", "Decision", "2026-04-20"),
  event("start", "Treatment_Start", "2026-05-01"),
  event("delivery", "Treatment_Delivery", "2026-07-01"),
  completed("done", "2026-08-01"),
  event("same-day-lab", "Lab", "2026-08-01"),
  event("late-response", "Treatment_Response", "2026-08-20"),
  event("scan-1", "Imaging", "2026-09-15"),
  event("ctdna-1", "ctDNA", "2026-09-15"),
  event("cysto", "Cystoscopy", "2026-11-10"),
  event("progression", "Progression", "2027-02-01"),
];

describe("selectSurveillancePhase", () => {
  it("holds the non-treatment events dated after the recorded completion, earliest first", () => {
    const phase = selectSurveillancePhase(journey);

    expect(phase.status).toBe("ready");
    if (phase.status !== "ready") return;
    expect(phase.completion.uid).toBe("done");
    expect(uids(phase.events)).toEqual(["ctdna-1", "scan-1", "cysto", "progression"]);
  });

  it("leaves the completion day and every treatment event, even a later response, to the Treatment phase", () => {
    const phase = selectSurveillancePhase(journey);
    if (phase.status !== "ready") throw new Error("expected a ready phase");

    expect(uids(phase.events)).not.toContain("same-day-lab");
    expect(uids(phase.events)).not.toContain("late-response");
    expect(uids(selectTreatmentPhase(journey)!.events)).toEqual(expect.arrayContaining(["same-day-lab", "late-response"]));
  });

  it("does not exist while treatment is ongoing, however many events follow", () => {
    const ongoing = journey.filter((e) => e.uid !== "done");
    expect(selectSurveillancePhase(ongoing)).toEqual({ status: "treatment-ongoing" });
  });

  it("is not started when a delivery after the completion shows treatment carried on", () => {
    const phase = selectSurveillancePhase([...journey, event("later-delivery", "Treatment_Delivery", "2026-09-01")]);
    expect(phase.status).toBe("treatment-ongoing");
  });

  it("reports that there is no treatment yet", () => {
    expect(selectSurveillancePhase([])).toEqual({ status: "no-treatment" });
    expect(selectSurveillancePhase(journey.filter((e) => !e.eventType.startsWith("Treatment_")))).toEqual({ status: "no-treatment" });
  });

  it("reports a completed treatment with nothing recorded after it, keeping the completion", () => {
    const phase = selectSurveillancePhase(journey.filter((e) => ["diagnosis", "start", "done", "same-day-lab"].includes(e.uid)));

    expect(phase.status).toBe("no-events-yet");
    if (phase.status === "no-events-yet") expect(phase.completion.uid).toBe("done");
  });

  it("never places undated events, but keeps them available", () => {
    const phase = selectSurveillancePhase([...journey, event("unknown-date", "Lab", null)]);
    if (phase.status !== "ready") throw new Error("expected a ready phase");

    expect(uids(phase.undated)).toEqual(["unknown-date"]);
    expect(uids(phase.events)).not.toContain("unknown-date");
  });

  it("does not need recorded relationships, and does not change what it is given", () => {
    const before = JSON.stringify(journey);
    const linked = journey.map((e) => (e.uid === "progression" ? { ...e, relatedEventUid: "scan-1", eventRelationship: "Assessed_By" } : e));
    const plain = selectSurveillancePhase(journey);
    const withLinks = selectSurveillancePhase(linked);

    if (plain.status !== "ready" || withLinks.status !== "ready") throw new Error("expected ready phases");
    expect(uids(withLinks.events)).toEqual(uids(plain.events));
    expect(JSON.stringify(journey)).toBe(before);
  });
});

describe("the three phases together", () => {
  it("never share an event, and between them hold every dated event", () => {
    const diagnosis = uids(selectDiagnosisPhase(journey)!.events);
    const treatment = uids(selectTreatmentPhase(journey)!.events);
    const surveillance = selectSurveillancePhase(journey);
    if (surveillance.status !== "ready") throw new Error("expected a ready phase");
    const later = uids(surveillance.events);

    expect(diagnosis.filter((uid) => treatment.includes(uid) || later.includes(uid))).toEqual([]);
    expect(treatment.filter((uid) => later.includes(uid))).toEqual([]);
    expect([...diagnosis, ...treatment, ...later].sort()).toEqual(journey.map((e) => e.uid).sort());
  });

  it("still partition when treatment came before the Diagnosis", () => {
    const events = [
      event("prior-bcg", "Treatment_Delivery", "2025-06-01"),
      event("diagnosis", "Diagnosis", "2026-04-10"),
      event("start", "Treatment_Start", "2026-05-01"),
      completed("done", "2026-08-01"),
      event("scan", "Imaging", "2026-09-01"),
    ];
    const diagnosis = uids(selectDiagnosisPhase(events)!.events);
    const treatment = uids(selectTreatmentPhase(events)!.events);
    const surveillance = selectSurveillancePhase(events);
    if (surveillance.status !== "ready") throw new Error("expected a ready phase");

    expect([...diagnosis, ...treatment, ...uids(surveillance.events)].sort()).toEqual(events.map((e) => e.uid).sort());
  });
});

describe("daysBetween", () => {
  it("counts whole days, across months and years, in either direction", () => {
    expect(daysBetween("2026-08-01", "2026-08-01")).toBe(0);
    expect(daysBetween("2026-08-01", "2026-09-15")).toBe(45);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
    expect(daysBetween("2026-09-15", "2026-08-01")).toBe(-45);
  });
});
