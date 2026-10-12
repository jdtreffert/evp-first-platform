import { eventFieldCatalog } from "../eventFieldCatalog";
import { eventTypeFields, relatedEventCandidates } from "../eventTypeFields";

describe("relatedEventCandidates", () => {
  test("only references real event types and relationship options", () => {
    for (const [type, rule] of Object.entries(relatedEventCandidates)) {
      expect(Object.keys(eventTypeFields)).toContain(type);
      for (const candidate of rule.eventTypes) expect(Object.keys(eventTypeFields)).toContain(candidate);
      expect(eventFieldCatalog.Event_Relationship.options).toContain(rule.relationship);
      for (const [candidate, relationship] of Object.entries(rule.relationshipByType ?? {})) {
        expect(rule.eventTypes).toContain(candidate);
        expect(eventFieldCatalog.Event_Relationship.options).toContain(relationship);
      }
      if ("withinDays" in rule) expect(rule.withinDays).toBeGreaterThan(0);
    }
  });

  test("each rule offers the agreed event types and window", () => {
    const types = (type: string) => [...relatedEventCandidates[type].eventTypes].sort();
    expect(types("Imaging")).toEqual(["Decision", "Imaging", "Pathology", "Progression", "Recurrence", "Symptom", "Treatment_Response"]);
    expect(types("Imaging_Response")).toEqual(["Imaging"]);
    expect(types("Cystoscopy")).toEqual(["Imaging", "Symptom"]);
    expect(types("TURBT")).toEqual(["Cystoscopy"]);
    expect(types("Pathology")).toEqual(["Cystoscopy_Biopsy", "TURBT"]);
    expect(types("Diagnosis")).toEqual(["Cystoscopy", "Cystoscopy_Biopsy", "Imaging", "Pathology"]);
    expect(types("Decision")).toEqual(["Diagnosis"]);
    expect(types("Treatment_Start")).toEqual(["Decision", "Diagnosis"]);
    expect(types("Treatment_Delivery")).toEqual(["Treatment_Start"]);
    expect(types("ctDNA")).toEqual(["Diagnosis", "Progression", "Recurrence", "Treatment_Delivery", "Treatment_Response", "Treatment_Start"]);
    expect(types("Treatment_Change")).toEqual(["Symptom", "Treatment_Change", "Treatment_Response", "Treatment_Start"]);
    expect(types("Symptom")).toEqual(["Diagnosis", "Procedure", "Treatment_Change", "Treatment_Delivery", "Treatment_Start"]);
    expect(types("Procedure")).toEqual(["Diagnosis", "Imaging", "Procedure", "Symptom", "TURBT", "Treatment_Change", "Treatment_Start"]);
    const windows = Object.fromEntries(Object.entries(relatedEventCandidates).map(([type, rule]) => [type, "withinDays" in rule ? rule.withinDays : "priorDays" in rule ? rule.priorDays : "all preceding"]));
    expect(windows).toEqual({ Imaging: 180, Imaging_Response: 30, Cystoscopy: 90, TURBT: 30, Pathology: 30, Diagnosis: 90, Decision: 90, Treatment_Start: 90, Treatment_Delivery: "all preceding", Treatment_Change: "all preceding", Symptom: "all preceding", Procedure: "all preceding", ctDNA: "all preceding" });
    expect(relatedEventCandidates.Pathology.relationship).toBe("Derived_From");
    expect(relatedEventCandidates.Imaging.relationshipByType).toEqual({ Imaging: "Follow_up_to" });
  });

  test("only these event types offer a picker", () => {
    expect(Object.keys(relatedEventCandidates).sort()).toEqual(["Cystoscopy", "Decision", "Diagnosis", "Imaging", "Imaging_Response", "Pathology", "Procedure", "Symptom", "TURBT", "Treatment_Change", "Treatment_Delivery", "Treatment_Start", "ctDNA"]);
  });
});
