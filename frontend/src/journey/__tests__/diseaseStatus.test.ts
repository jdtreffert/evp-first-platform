import { describe, expect, it } from "vitest";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { describeDiseaseStatus, formatLongDay, summarizeDiseaseStatus } from "../diseaseStatus";
import type { RecordedDiseaseStatus } from "../diseaseStatus";

function event(uid: string, eventType: string, eventDate: string | null, extra: Partial<UnifiedEvent> = {}): UnifiedEvent {
  return { uid, masterId: "M1", eventType, eventDate, payload: { id: uid, fields: {} }, ...extra };
}

const status = (uid: string, eventDate: string | null, category: string | null, extra: Partial<UnifiedEvent> = {}) =>
  event(uid, "Disease_Status", eventDate, { diseaseStatusCategory: category, ...extra });

function recorded(events: UnifiedEvent[]): RecordedDiseaseStatus {
  const summary = summarizeDiseaseStatus(events);
  if (summary.status !== "recorded") throw new Error("expected a recorded status");
  return summary;
}

describe("summarizeDiseaseStatus", () => {
  it("is not recorded when there is no Disease_Status, whatever the other events show", () => {
    const journey = [
      event("response", "Treatment_Response", "2026-07-01", { treatmentResponseCategory: "CR" }),
      event("scan", "Imaging", "2026-08-01", { imagingResult: "Negative" } as Partial<UnifiedEvent>),
      event("ctdna", "ctDNA", "2026-08-02", { ctDNAValue: 0 }),
      event("cysto", "Cystoscopy", "2026-08-03"),
    ];
    const summary = summarizeDiseaseStatus(journey);

    // A complete response with no Recurrence or Progression never becomes "no evidence of disease".
    expect(summary.status).toBe("not-recorded");
    expect(summary).not.toHaveProperty("category");
    expect(describeDiseaseStatus(summary)).toMatch(/^Disease status: not recorded\./);
    expect(describeDiseaseStatus(summary)).not.toMatch(/no evidence/i);
  });

  it("shows the latest Treatment_Response, Recurrence or Progression milestone as it is when no status is recorded", () => {
    const summary = summarizeDiseaseStatus([
      event("response", "Treatment_Response", "2026-07-01"),
      event("recurrence", "Recurrence", "2026-09-10"),
      event("scan", "Imaging", "2026-10-01"),
    ]);

    expect(summary).toMatchObject({ status: "not-recorded" });
    expect(summary.status === "not-recorded" && summary.latestMilestone?.uid).toBe("recurrence");
    expect(describeDiseaseStatus(summary)).toBe("Disease status: not recorded. The latest Recurrence recorded is on September 10, 2026.");
  });

  it("has no milestone either when there is none", () => {
    expect(summarizeDiseaseStatus([])).toEqual({ status: "not-recorded", latestMilestone: null, undated: [] });
  });

  it("picks the latest dated Disease_Status, ties going to the later uid, and exposes what was recorded", () => {
    const summary = recorded([
      status("old", "2026-05-01", "Disease present"),
      status("b", "2026-08-15", "No evidence of disease", {
        diseaseStatusExtent: "Not specified",
        diseaseStatusBasis: "Patient recorded from clinician communication",
        diseaseStatusConfidence: "Probable",
        diseaseStatusNotes: "Told at the visit",
        eventSource: "Patient",
        recordedAt: "2026-08-16T10:00:00Z",
        documentAttachment: ["doc-1"],
        documentType: "Visit Summary",
      }),
      status("a", "2026-08-15", "Indeterminate or suspicious"),
    ]);

    expect(summary).toMatchObject({
      day: "2026-08-15",
      category: "No evidence of disease",
      categoryLabel: "No evidence of disease",
      extent: "Not specified",
      basis: "Patient recorded from clinician communication",
      confidence: "Probable",
      notes: "Told at the visit",
      source: "Patient",
      documentIds: ["doc-1"],
      documentType: "Visit Summary",
    });
    expect(summary.event.uid).toBe("b");
    expect(summary.event.recordedAt).toBe("2026-08-16T10:00:00Z");
  });

  it("exposes the one supporting event and its relationship when recorded, and not when it is missing", () => {
    const scan = event("scan", "Imaging", "2026-08-10");
    const withLink = recorded([scan, status("ds", "2026-08-15", "No evidence of disease", { relatedEventUid: "scan", eventRelationship: "Derived_From" })]);
    const unresolved = recorded([status("ds", "2026-08-15", "No evidence of disease", { relatedEventUid: "gone", eventRelationship: "Derived_From" })]);
    const none = recorded([status("ds", "2026-08-15", "No evidence of disease")]);

    expect(withLink).toMatchObject({ supportingEventUid: "scan", relationship: "Derived_From" });
    expect(withLink.supportingEvent?.uid).toBe("scan");
    expect(unresolved).toMatchObject({ supportingEventUid: "gone", supportingEvent: null });
    expect(none).toMatchObject({ supportingEventUid: null, supportingEvent: null, relationship: null });
  });

  it("does not treat an undated status as the latest, and reports it", () => {
    const summary = recorded([status("dated", "2026-05-01", "Disease present"), status("undated", null, "No evidence of disease")]);
    expect(summary.event.uid).toBe("dated");
    expect(summary.undated.map((e) => e.uid)).toEqual(["undated"]);

    const only = summarizeDiseaseStatus([status("undated", null, "No evidence of disease")]);
    expect(only.status).toBe("not-recorded");
    expect(describeDiseaseStatus(only)).toContain("1 disease status event has no date");
  });

  it("ignores a withdrawn status", () => {
    const summary = summarizeDiseaseStatus([status("withdrawn", "2026-08-15", "No evidence of disease", { withdrawnAt: "2026-08-20T00:00:00Z" })]);
    expect(summary.status).toBe("not-recorded");
  });

  it("copes with a missing or unrecognised category", () => {
    expect(recorded([status("x", "2026-08-15", null)])).toMatchObject({ category: null, categoryLabel: null });
    expect(describeDiseaseStatus(recorded([status("x", "2026-08-15", "Cured")]))).toContain("category that is not recognised");
  });
});

describe("a recorded status is not presented as confirmed now", () => {
  it("is stated with the date it was recorded, never as current or as today's status", () => {
    const text = describeDiseaseStatus(recorded([status("ds", "2026-08-15", "No evidence of disease")]));

    expect(text).toBe("Latest recorded disease status: No evidence of disease. Recorded August 15, 2026.");
    expect(text).not.toMatch(/today|now|current|NED/i);
  });

  it("does not claim confirmation even when the date is long past or the same as the latest event", () => {
    const old = describeDiseaseStatus(recorded([status("ds", "2020-01-02", "No evidence of disease"), event("later", "Note", "2026-10-01")]));
    expect(old).toContain("Recorded January 2, 2020.");
    expect(old).not.toMatch(/confirmed|today|current/i);
  });

  it("includes extent, basis, confidence and source when recorded, without turning them into a statement of fact", () => {
    const text = describeDiseaseStatus(
      recorded([
        status("ds", "2026-08-15", "Disease present", {
          diseaseStatusExtent: "Regional",
          diseaseStatusBasis: "Clinician documented",
          diseaseStatusConfidence: "Possible",
          eventSource: "Clinician",
        }),
      ]),
    );

    expect(text).toBe("Latest recorded disease status: Disease present. Recorded August 15, 2026. Extent: Regional. Basis: Clinician documented. Confidence: Possible. Source: Clinician.");
  });
});

describe("newer assessment evidence", () => {
  const ds = status("ds", "2026-08-15", "No evidence of disease");

  it("is detected by event type and date alone, earliest first", () => {
    const summary = recorded([
      ds,
      event("late-ctdna", "ctDNA", "2026-12-01"),
      event("scan", "Imaging", "2026-10-01"),
      event("recurrence", "Recurrence", "2026-11-01"),
      event("old-scan", "Imaging", "2026-08-01"),
    ]);

    expect(summary.newerEvidence.map((e) => e.uid)).toEqual(["scan", "recurrence", "late-ctdna"]);
    expect(describeDiseaseStatus(summary)).toContain("Newer assessment evidence exists (3 events dated after August 15, 2026).");
  });

  it("counts every evidence type and nothing else", () => {
    const types = ["Imaging", "Imaging_Response", "Cystoscopy", "Cystoscopy_Biopsy", "Cytology", "Pathology", "ctDNA", "utDNA", "Treatment_Response", "Recurrence", "Progression"];
    const evidence = types.map((type, index) => event(`e${index}`, type, "2026-09-01"));
    const others = ["Lab", "Symptom", "QoL", "Note", "Decision", "Treatment_Delivery", "Procedure"].map((type) => event(type, type, "2026-09-01"));

    expect(recorded([ds, ...evidence, ...others]).newerEvidence).toHaveLength(types.length);
  });

  it("does not count same-day or earlier evidence, undated evidence or a withdrawn event, and says nothing when there is none", () => {
    const summary = recorded([
      ds,
      event("same-day", "Imaging", "2026-08-15"),
      event("earlier", "ctDNA", "2026-08-14"),
      event("undated", "Imaging", null),
      event("withdrawn", "Imaging", "2026-09-01", { withdrawnAt: "2026-09-02T00:00:00Z" }),
    ]);

    expect(summary.newerEvidence).toEqual([]);
    expect(describeDiseaseStatus(summary)).not.toMatch(/newer/i);
  });

  it("does not interpret the newer evidence: the same statement and status whatever it shows", () => {
    const negative = recorded([ds, event("scan", "Imaging", "2026-10-01", { imagingResult: "No findings" } as Partial<UnifiedEvent>)]);
    const concerning = recorded([ds, event("scan", "Imaging", "2026-10-01", { imagingResult: "New mass" } as Partial<UnifiedEvent>), event("progression", "Progression", "2026-10-02")]);

    expect(negative.category).toBe("No evidence of disease");
    expect(concerning.category).toBe("No evidence of disease");
    expect(describeDiseaseStatus(negative)).toContain("Newer assessment evidence exists (1 event dated after");
    expect(describeDiseaseStatus(concerning)).toContain("Newer assessment evidence exists (2 events dated after");
  });

  it("is judged against the latest status, so a newer status resets it", () => {
    const summary = recorded([ds, event("scan", "Imaging", "2026-10-01"), status("ds2", "2026-10-15", "No evidence of disease")]);
    expect(summary.event.uid).toBe("ds2");
    expect(summary.newerEvidence).toEqual([]);
  });
});

describe("summarizeDiseaseStatus changes nothing", () => {
  it("does not mutate the events it is given and creates none", () => {
    const events = [status("ds", "2026-08-15", "Disease present"), event("scan", "Imaging", "2026-10-01"), event("recurrence", "Recurrence", "2026-09-01")];
    const before = JSON.stringify(events);
    const summary = summarizeDiseaseStatus(events);
    describeDiseaseStatus(summary);

    expect(JSON.stringify(events)).toBe(before);
    expect(events).toHaveLength(3);
    // Disease present is recorded as given; it creates no Recurrence or Progression of its own.
    expect(events.filter((e) => e.eventType === "Progression")).toEqual([]);
    expect(recorded(events).category).toBe("Disease present");
  });
});

describe("formatLongDay", () => {
  it("writes a calendar date in words, without any time zone shift", () => {
    expect(formatLongDay("2026-08-15")).toBe("August 15, 2026");
    expect(formatLongDay("2027-01-01")).toBe("January 1, 2027");
    expect(formatLongDay("2024-12-31")).toBe("December 31, 2024");
  });
});
