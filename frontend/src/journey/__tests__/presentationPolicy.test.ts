import { describe, expect, it } from "vitest";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { eventFieldCatalog } from "../../../../backend/src/schemas/eventFieldCatalog";
import { eventTypeFields } from "../../../../backend/src/schemas/eventTypeFields";
import {
  ENCOUNTER_COLOR,
  diseaseStatusLabel,
  LANES,
  OTHER_LANE,
  UNASSIGNED_EVENT_TYPES,
  compactLabel,
  eventTypeLabel,
  isIncompleteDelivery,
  lanesFor,
  legendFor,
  presentationFor,
  presentationForEvent,
  JOURNEY_MILESTONES_LANE,
  SUMMARY_LANES,
  summaryLabel,
  summaryLaneFor,
  summaryPresentationFor,
  treatmentChangeLabels,
} from "../presentationPolicy";

const registeredTypes = Object.keys(eventTypeFields);

describe("lane assignment", () => {
  const expected: Record<string, string[]> = {
    Treatment: ["Treatment_Start", "Treatment_Delivery", "Treatment_Change"],
    "Response & Disease Status": ["Treatment_Response", "Recurrence", "Progression"],
    "Symptoms & Experience": ["Symptom", "QoL"],
    Investigations: ["Lab", "Imaging", "Imaging_Response", "Cytology", "Cystoscopy", "ctDNA", "utDNA"],
    Procedures: ["TURBT", "Cystoscopy_Biopsy", "Procedure"],
    "Pathology & Molecular": ["Pathology", "Somatic", "Germline"],
    "Context & Self-Management": ["Note"],
    "Decisions & Milestones": ["Diagnosis", "Decision", "Disease_Status"],
  };

  it.each(Object.entries(expected))("places the %s event types in that lane", (laneLabel, types) => {
    for (const type of types) {
      const presentation = presentationFor(type);
      expect(presentation.lane.label).toBe(laneLabel);
      expect(presentation.assigned).toBe(true);
    }
  });

  it("draws the lanes in the agreed order", () => {
    expect(LANES.map((lane) => lane.label)).toEqual(Object.keys(expected));
  });

  it("covers every registered event type exactly once, either assigned or deliberately unassigned", () => {
    const unassigned: string[] = [...UNASSIGNED_EVENT_TYPES];
    const assigned = registeredTypes.filter((type) => presentationFor(type).assigned);

    // A new event type in the schema fails here until it is given a lane or listed as unassigned.
    expect(registeredTypes.filter((type) => !assigned.includes(type) && !unassigned.includes(type))).toEqual([]);
    expect(assigned.filter((type) => unassigned.includes(type))).toEqual([]);
    expect(unassigned.filter((type) => !registeredTypes.includes(type))).toEqual([]);
  });

  it("gives every registered event type a lane, so the unassigned list is empty", () => {
    expect([...UNASSIGNED_EVENT_TYPES]).toEqual([]);
    for (const type of registeredTypes) expect(presentationFor(type).assigned).toBe(true);
  });

  it("places the treatment types in the Treatment lane and the response and disease status types together", () => {
    for (const type of ["Treatment_Start", "Treatment_Delivery", "Treatment_Change"]) {
      expect(presentationFor(type).lane.id).toBe("treatment");
    }
    for (const type of ["Treatment_Response", "Recurrence", "Progression"]) {
      expect(presentationFor(type).lane.id).toBe("response-disease-status");
    }
  });

  it("uses every lane for at least one event type", () => {
    const used = new Set(registeredTypes.map((type) => presentationFor(type).lane.id));
    for (const lane of LANES) expect(used.has(lane.id)).toBe(true);
  });
});

describe("unknown event types", () => {
  it("are drawn in the Other lane under their own name instead of failing", () => {
    expect(presentationFor("Some_New_Type")).toEqual({
      label: "Some New Type",
      lane: OTHER_LANE,
      assigned: false,
      milestone: false,
      marker: "standard",
    });
  });

  it("do not pick up properties inherited from Object", () => {
    expect(presentationFor("constructor").assigned).toBe(false);
    expect(presentationFor("toString").lane).toEqual(OTHER_LANE);
  });
});

describe("milestones", () => {
  it("marks the event types where evidence becomes a conclusion or decision, and no other", () => {
    expect(registeredTypes.filter((type) => presentationFor(type).milestone).sort()).toEqual(
      ["Diagnosis", "Disease_Status", "Progression", "Recurrence", "Treatment_Change", "Treatment_Response", "Treatment_Start"],
    );
  });

  it("does not mark routine events such as deliveries, imaging or labs", () => {
    for (const type of ["Treatment_Delivery", "Imaging", "Lab", "Symptom", "Note", "Decision"]) {
      expect(presentationFor(type).milestone).toBe(false);
    }
  });
});

describe("colors", () => {
  it("gives every lane its own color, none matching the encounter line", () => {
    const colors = [...LANES.map((lane) => lane.color), OTHER_LANE.color, ENCOUNTER_COLOR];
    expect(new Set(colors).size).toBe(colors.length);
    for (const color of colors) expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("eventTypeLabel", () => {
  it("uses the friendly names, and the type's own name otherwise", () => {
    expect(eventTypeLabel("QoL")).toBe("Quality of life");
    expect(eventTypeLabel("Lab")).toBe("Lab work");
    expect(eventTypeLabel("Imaging_Response")).toBe("Imaging response");
    expect(eventTypeLabel("Cystoscopy_Biopsy")).toBe("Cystoscopy biopsy");
    expect(eventTypeLabel("Treatment_Delivery")).toBe("Treatment Delivery");
    expect(presentationFor("Lab").label).toBe("Lab work");
  });
});

describe("lanesFor", () => {
  it("returns only the lanes that have events, in the agreed order", () => {
    expect(lanesFor(["Decision", "Symptom", "Imaging", "Lab"]).map((lane) => lane.label)).toEqual([
      "Symptoms & Experience",
      "Investigations",
      "Decisions & Milestones",
    ]);
  });

  it("adds the Other lane last, only when something needs it", () => {
    expect(lanesFor(["Some_New_Type", "Symptom"]).map((lane) => lane.id)).toEqual(["symptoms-experience", "other"]);
    expect(lanesFor(["Symptom"]).map((lane) => lane.id)).toEqual(["symptoms-experience"]);
  });

  it("returns no lanes for no events", () => {
    expect(lanesFor([])).toEqual([]);
  });
});

function delivery(extra: Partial<UnifiedEvent> = {}, uid = "d1"): UnifiedEvent {
  return { uid, masterId: "M1", eventType: "Treatment_Delivery", eventDate: "2026-05-01", payload: { id: uid, fields: {} }, ...extra };
}

describe("compactLabel", () => {
  it("labels a delivery by its treatment's short name, with the cycle when recorded", () => {
    expect(compactLabel(delivery({ treatmentName: "EV" }))).toBe("EV");
    expect(compactLabel(delivery({ treatmentName: "EV", treatmentCycle: 2 }))).toBe("EV C2");
    expect(compactLabel(delivery({ treatmentName: "Pembrolizumab", treatmentCycle: 3 }))).toBe("pembro C3");
    expect(compactLabel(delivery({ treatmentName: "Gem/Cis" }))).toBe("Gem/Cis");
  });

  it("labels a radiation dose by the dose and units", () => {
    expect(compactLabel(delivery({ treatmentName: "IMRT", treatmentDose: 1, treatmentDoseUnits: "Gy" }))).toBe("1 Gy");
    expect(compactLabel(delivery({ treatmentDose: 1.8, treatmentDoseUnits: "Gy" }))).toBe("1.8 Gy");
    expect(compactLabel(delivery({ treatmentDose: 180, treatmentDoseUnits: "cGy" }))).toBe("180 cGy");
    expect(compactLabel(delivery({ treatmentDose: 0, treatmentDoseUnits: "Gy" }))).toBe("0 Gy");
  });

  it("does not put a drug dose on the marker, and falls back to the name when radiation has no dose", () => {
    expect(compactLabel(delivery({ treatmentName: "EV", treatmentDose: 125, treatmentDoseUnits: "mg" }))).toBe("EV");
    expect(compactLabel(delivery({ treatmentName: "IMRT", treatmentDoseUnits: "Gy" }))).toBe("IMRT");
  });

  it("says Delivery when no treatment is named, never guessing one", () => {
    expect(compactLabel(delivery())).toBe("Delivery");
    expect(compactLabel(delivery({ treatmentCycle: 4 }))).toBe("Delivery C4");
  });

  it("uses the name of the type for every other event", () => {
    const other = (eventType: string): UnifiedEvent => ({ uid: "x", masterId: "M1", eventType, eventDate: "2026-05-01", payload: { id: "x", fields: {} } });
    expect(compactLabel(other("Lab"))).toBe("Lab work");
    expect(compactLabel(other("Treatment_Start"))).toBe("Treatment Start");
    expect(compactLabel(other("Imaging"))).toBe("Imaging");
  });
});

describe("isIncompleteDelivery", () => {
  it("is true only for a delivery recorded as held, interrupted, partial or not completed", () => {
    for (const status of ["Held", "Interrupted", "Partially Delivered", "Not Completed"]) {
      expect(isIncompleteDelivery(delivery({ treatmentDeliveryStatus: status }))).toBe(true);
    }
  });

  it("is false for other statuses, and for a missing status, which is unknown rather than incomplete", () => {
    for (const status of ["Delivered as Planned", "Dose Reduced", "Dose Increased", "Delayed", "Unknown"]) {
      expect(isIncompleteDelivery(delivery({ treatmentDeliveryStatus: status }))).toBe(false);
    }
    expect(isIncompleteDelivery(delivery())).toBe(false);
    expect(isIncompleteDelivery(delivery({ treatmentDeliveryStatus: null }))).toBe(false);
  });

  it("is false for events that are not deliveries", () => {
    expect(isIncompleteDelivery({ ...delivery({ treatmentDeliveryStatus: "Held" }), eventType: "Lab" })).toBe(false);
  });
});

describe("legendFor", () => {
  it("explains each abbreviation used once, in order of appearance", () => {
    const events = [
      delivery({ treatmentName: "Pembrolizumab" }, "a"),
      delivery({ treatmentName: "EV" }, "b"),
      delivery({ treatmentName: "Pembrolizumab", treatmentCycle: 2 }, "c"),
    ];
    expect(legendFor(events)).toEqual([
      { short: "pembro", full: "Pembrolizumab" },
      { short: "EV", full: "Enfortumab vedotin" },
    ]);
  });

  it("leaves out names with nothing to explain, radiation doses and non-deliveries", () => {
    expect(legendFor([delivery({ treatmentName: "Proton therapy" }), delivery({ treatmentName: "IMRT", treatmentDose: 2, treatmentDoseUnits: "Gy" })])).toEqual([]);
    expect(legendFor([{ ...delivery({ treatmentName: "EV" }), eventType: "Treatment_Start" }])).toEqual([]);
    expect(legendFor([])).toEqual([]);
  });
});

describe("Disease_Status presentation", () => {
  const status = (category: string | null | undefined, extra: Partial<UnifiedEvent> = {}): UnifiedEvent => ({
    uid: "ds",
    masterId: "M1",
    eventType: "Disease_Status",
    eventDate: "2026-08-15",
    diseaseStatusCategory: category,
    payload: { id: "ds", fields: {} },
    ...extra,
  });

  it("is a milestone in Decisions & Milestones, with its own marker style and no other type having it", () => {
    const presentation = presentationFor("Disease_Status");

    expect(presentation).toMatchObject({ lane: { id: "decisions-milestones" }, assigned: true, milestone: true, marker: "assessment" });
    expect(registeredTypes.filter((type) => presentationFor(type).marker === "assessment")).toEqual(["Disease_Status"]);
  });

  it.each([
    ["No evidence of disease", "No evidence of disease"],
    ["Indeterminate or suspicious", "Indeterminate or suspicious"],
    ["Disease present", "Disease present"],
    ["Unknown", "Disease status unknown"],
  ])("labels the category %j as %j", (category, label) => {
    expect(compactLabel(status(category))).toBe(label);
    expect(diseaseStatusLabel(category)).toBe(label);
  });

  it("labels Indeterminate or suspicious without calling it disease present", () => {
    expect(compactLabel(status("Indeterminate or suspicious"))).not.toMatch(/disease present/i);
  });

  it.each([null, undefined, "", "Cured", "NED", "no evidence of disease", "constructor"])(
    "falls back to the name of the type for the unrecognised category %j instead of failing",
    (category) => {
      expect(diseaseStatusLabel(category)).toBeNull();
      expect(compactLabel(status(category))).toBe("Disease Status");
    },
  );

  it("takes the label from the category only, never from the notes, summary, extent or confidence", () => {
    const event = status("Indeterminate or suspicious", {
      diseaseStatusNotes: "No evidence of disease",
      eventSummary: "Disease present",
      diseaseStatusExtent: "Metastatic",
      diseaseStatusConfidence: "Confirmed",
    });

    expect(compactLabel(event)).toBe("Indeterminate or suspicious");
    expect(compactLabel(status(null, { diseaseStatusNotes: "No evidence of disease", eventSummary: "Disease present" }))).toBe("Disease Status");
  });
});

describe("a Decision that confirms a complete response", () => {
  const decision = (decisionType: string | null | undefined): UnifiedEvent => ({
    uid: "d",
    masterId: "M1",
    eventType: "Decision",
    eventDate: "2026-08-20",
    decisionType,
    payload: { id: "d", fields: {} },
  });

  it("is a milestone, in the Decisions & Milestones lane like every Decision, with the ordinary marker", () => {
    const presentation = presentationForEvent(decision("Complete response confirmed"));

    expect(presentation).toMatchObject({ milestone: true, marker: "standard", assigned: true, lane: { id: "decisions-milestones" } });
    expect(presentation.lane).toBe(presentationFor("Decision").lane);
  });

  it("is labelled by what it records", () => {
    expect(compactLabel(decision("Complete response confirmed"))).toBe("Complete response confirmed");
  });

  it.each(["Elect bladder preservation", "Hold treatment", "Other", "complete response confirmed", "", null, undefined])(
    "leaves every other Decision, such as %j, as it was: an ordinary marker labelled Decision",
    (decisionType) => {
      expect(presentationForEvent(decision(decisionType))).toEqual(presentationFor("Decision"));
      expect(presentationForEvent(decision(decisionType)).milestone).toBe(false);
      expect(compactLabel(decision(decisionType))).toBe("Decision");
    },
  );

  it("does not make any other event type a milestone because it carries that value", () => {
    const note: UnifiedEvent = { ...decision("Complete response confirmed"), eventType: "Note" };

    expect(presentationForEvent(note)).toEqual(presentationFor("Note"));
  });

  it("does not change what presentationFor says about the Decision type", () => {
    expect(presentationFor("Decision").milestone).toBe(false);
  });
});

describe("Journey Summary presentation", () => {
  const ev = (eventType: string, extra: Partial<UnifiedEvent> = {}): UnifiedEvent => ({
    uid: "e",
    masterId: "M1",
    eventType,
    eventDate: "2026-08-15",
    payload: { id: "e", fields: {} },
    ...extra,
  });

  it("has two presentation-only lanes, Journey Milestones first, the second being the existing Response & Disease Status lane", () => {
    expect(SUMMARY_LANES.map((lane) => lane.label)).toEqual(["Journey Milestones", "Response & Disease Status"]);
    expect(SUMMARY_LANES[1]).toBe(LANES.find((lane) => lane.id === "response-disease-status"));
    // The Summary lane is not one of the phase lanes, so the phase views are unaffected.
    expect(LANES.map((lane) => lane.id)).not.toContain(JOURNEY_MILESTONES_LANE.id);
    const colors = [...LANES.map((lane) => lane.color), OTHER_LANE.color, ENCOUNTER_COLOR, JOURNEY_MILESTONES_LANE.color];
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("assigns the lane from the event: milestones of the journey in one, response and disease status in the other", () => {
    for (const type of ["Diagnosis", "Treatment_Start", "Treatment_Change"]) expect(summaryLaneFor(ev(type)).label).toBe("Journey Milestones");
    for (const type of ["Disease_Status", "Recurrence", "Progression"]) expect(summaryLaneFor(ev(type)).label).toBe("Response & Disease Status");
    expect(summaryLaneFor(ev("Decision", { decisionType: "Complete response confirmed" })).label).toBe("Response & Disease Status");
    expect(summaryLaneFor(ev("Treatment_Change", { treatmentChangeType: "Treatment completed" })).label).toBe("Journey Milestones");
  });

  it("presents every Summary event as a milestone, with the assessment marker only for Disease_Status, and leaves the phase policy alone", () => {
    expect(summaryPresentationFor(ev("Diagnosis"))).toMatchObject({ milestone: true, marker: "standard", assigned: true });
    expect(summaryPresentationFor(ev("Disease_Status"))).toMatchObject({ milestone: true, marker: "assessment" });
    expect(presentationFor("Diagnosis").lane.label).toBe("Decisions & Milestones");
    expect(presentationFor("Treatment_Start").lane.label).toBe("Treatment");
  });

  it("labels Treatment_Change by its recorded type, with an entry for every Treatment_Change_Type option in the schema", () => {
    for (const option of eventFieldCatalog.Treatment_Change_Type.options ?? []) {
      expect(treatmentChangeLabels[option], option).toBeTruthy();
    }
    expect(Object.keys(treatmentChangeLabels).sort()).toEqual([...(eventFieldCatalog.Treatment_Change_Type.options ?? [])].sort());
    expect(summaryLabel(ev("Treatment_Change", { treatmentChangeType: "Treatment completed" }))).toBe("Treatment completed");
  });

  it("labels the confirmed complete response, and every other event as the phase views do", () => {
    expect(summaryLabel(ev("Decision", { decisionType: "Complete response confirmed" }))).toBe("Complete response confirmed");
    expect(summaryLabel(ev("Diagnosis"))).toBe("Diagnosis");
    expect(summaryLabel(ev("Treatment_Start"))).toBe("Treatment Start");
    expect(summaryLabel(ev("Disease_Status", { diseaseStatusCategory: "Unknown" }))).toBe("Disease status unknown");
  });
});
