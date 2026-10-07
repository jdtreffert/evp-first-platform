import { eventFieldCatalog } from "../eventFieldCatalog";
import { eventTypeFields, relatedEventCandidates } from "../eventTypeFields";

describe("relatedEventCandidates", () => {
  test("only references real event types and relationship options", () => {
    for (const [type, rule] of Object.entries(relatedEventCandidates)) {
      expect(Object.keys(eventTypeFields)).toContain(type);
      for (const candidate of rule.eventTypes) expect(Object.keys(eventTypeFields)).toContain(candidate);
      expect(eventFieldCatalog.Event_Relationship.options).toContain(rule.relationship);
      expect(rule.withinDays).toBeGreaterThan(0);
    }
  });

  test("each rule offers the agreed event types within 30 days", () => {
    const types = (type: string) => [...relatedEventCandidates[type].eventTypes].sort();
    expect(types("Imaging")).toEqual(["Decision", "Pathology", "Progression", "Recurrence", "Symptom", "Treatment_Response"]);
    expect(types("Cystoscopy")).toEqual(["Imaging", "Symptom"]);
    expect(types("TURBT")).toEqual(["Cystoscopy"]);
    expect(types("Pathology")).toEqual(["Cystoscopy_Biopsy", "TURBT"]);
    expect(Object.values(relatedEventCandidates).every((rule) => rule.withinDays === 30)).toBe(true);
    expect(relatedEventCandidates.Pathology.relationship).toBe("Derived_From");
  });

  test("only these event types offer a picker", () => {
    expect(Object.keys(relatedEventCandidates).sort()).toEqual(["Cystoscopy", "Imaging", "Pathology", "TURBT"]);
  });
});
