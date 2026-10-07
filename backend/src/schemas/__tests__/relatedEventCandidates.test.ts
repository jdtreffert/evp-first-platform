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

  test("a Pathology event offers TURBT events within 30 days", () => {
    expect(relatedEventCandidates.Pathology).toMatchObject({ eventTypes: ["TURBT"], withinDays: 30, relationship: "Derived_From" });
  });
});
