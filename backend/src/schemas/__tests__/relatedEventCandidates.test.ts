import { eventFieldCatalog } from "../eventFieldCatalog";
import { eventTypeFields, relatedEventCandidates } from "../eventTypeFields";

describe("relatedEventCandidates", () => {
  test("only references real event types and relationship options", () => {
    for (const [type, rule] of Object.entries(relatedEventCandidates)) {
      expect(Object.keys(eventTypeFields)).toContain(type);
      for (const candidate of rule.eventTypes) expect(Object.keys(eventTypeFields)).toContain(candidate);
      expect(eventFieldCatalog.Event_Relationship.options).toContain(rule.relationship);
    }
  });

  test("each rule offers the agreed event types", () => {
    const types = (type: string) => [...relatedEventCandidates[type].eventTypes].sort();
    expect(types("Imaging")).toEqual(["Decision", "Pathology", "Progression", "Recurrence", "Symptom", "Treatment_Response"]);
    expect(types("Cystoscopy")).toEqual(["Imaging", "Symptom"]);
    expect(types("TURBT")).toEqual(["Cystoscopy"]);
    expect(types("Pathology")).toEqual(["Cystoscopy_Biopsy", "TURBT"]);
    expect(types("Diagnosis")).toEqual(["Cystoscopy", "Cystoscopy_Biopsy", "Imaging", "Pathology"]);
    expect(types("Decision")).toEqual(["Diagnosis"]);
    expect(types("Treatment_Start")).toEqual(["Decision", "Diagnosis"]);
    expect(types("Treatment_Delivery")).toEqual(["Treatment_Start"]);
    expect(types("Procedure")).toEqual(["Diagnosis", "Imaging", "Procedure", "Symptom", "TURBT", "Treatment_Change", "Treatment_Start"]);
    expect(relatedEventCandidates.Pathology.relationship).toBe("Derived_From");
  });

  test("rules carry no date window", () => {
    for (const rule of Object.values(relatedEventCandidates)) expect(Object.keys(rule).sort()).toEqual(["eventTypes", "relationship"]);
  });

  test("only these event types offer a picker", () => {
    expect(Object.keys(relatedEventCandidates).sort()).toEqual(["Cystoscopy", "Decision", "Diagnosis", "Imaging", "Pathology", "Procedure", "TURBT", "Treatment_Delivery", "Treatment_Start"]);
  });
});
