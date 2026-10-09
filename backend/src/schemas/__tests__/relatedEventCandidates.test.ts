import { eventFieldCatalog } from "../eventFieldCatalog";
import { eventTypeFields, relatedEventCandidates } from "../eventTypeFields";

describe("relatedEventCandidates", () => {
  test("only references real event types and relationship options", () => {
    for (const [type, rule] of Object.entries(relatedEventCandidates)) {
      expect(Object.keys(eventTypeFields)).toContain(type);
      for (const candidate of rule.eventTypes) expect(Object.keys(eventTypeFields)).toContain(candidate);
      expect(eventFieldCatalog.Event_Relationship.options).toContain(rule.relationship);
      if ("withinDays" in rule) expect(rule.withinDays).toBeGreaterThan(0);
    }
  });

  test("each rule offers the agreed event types and window", () => {
    const types = (type: string) => [...relatedEventCandidates[type].eventTypes].sort();
    expect(types("Imaging")).toEqual(["Decision", "Pathology", "Progression", "Recurrence", "Symptom", "Treatment_Response"]);
    expect(types("Cystoscopy")).toEqual(["Imaging", "Symptom"]);
    expect(types("TURBT")).toEqual(["Cystoscopy"]);
    expect(types("Pathology")).toEqual(["Cystoscopy_Biopsy", "TURBT"]);
    expect(types("Diagnosis")).toEqual(["Cystoscopy", "Cystoscopy_Biopsy", "Imaging", "Pathology"]);
    expect(types("Decision")).toEqual(["Diagnosis"]);
    expect(types("Treatment_Start")).toEqual(["Decision", "Diagnosis"]);
    expect(types("Treatment_Delivery")).toEqual(["Treatment_Start"]);
    const windows = Object.fromEntries(Object.entries(relatedEventCandidates).map(([type, rule]) => [type, "withinDays" in rule ? rule.withinDays : "all preceding"]));
    expect(windows).toEqual({ Imaging: 90, Cystoscopy: 90, TURBT: 30, Pathology: 30, Diagnosis: 90, Decision: 90, Treatment_Start: 90, Treatment_Delivery: "all preceding" });
    expect(relatedEventCandidates.Pathology.relationship).toBe("Derived_From");
  });

  test("only these event types offer a picker", () => {
    expect(Object.keys(relatedEventCandidates).sort()).toEqual(["Cystoscopy", "Decision", "Diagnosis", "Imaging", "Pathology", "TURBT", "Treatment_Delivery", "Treatment_Start"]);
  });
});
