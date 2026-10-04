import { ingestEvent } from "../../services/ingestionService";
import { normalizerRegistry } from "../normalizerRegistry";

const base = { Master_ID: "M1", Event_Date: "2026-01-02" };

describe("event type cleanup", () => {
  test.each(["Labs", "Treatment_Outcome", "Treatment_Regimen_Details"])("%s is no longer an event type", (type) => {
    expect(type in normalizerRegistry).toBe(false);
    expect(() => ingestEvent({ id: "x", fields: { ...base, Event_Type: type } })).toThrow("Unsupported event type");
  });

  test.each(["Treatment_Start", "Treatment_Change"])("%s carries regimen details", (type) => {
    const event = ingestEvent({
      id: "r1",
      fields: { ...base, Event_Type: type, Event_UID: "r1", Treatment_Name: "EVP", Treatment_Regimen_Details: "Days 1 and 8" },
    });
    expect(event.eventType).toBe(type);
    expect(event.treatmentRegimenDetails).toBe("Days 1 and 8");
  });

  test("Lab is accepted", () => {
    const event = ingestEvent({ id: "l1", fields: { ...base, Event_Type: "Lab", Event_UID: "l1", Lab_Flags: ["WBC_low"] } });
    expect(event.eventType).toBe("Lab");
  });
});

describe("optional document attributes", () => {
  test("Document is no longer an event type", () => {
    expect("Document" in normalizerRegistry).toBe(false);
  });

  test.each(["Note", "QoL", "Symptom", "Event_Measure", "TURBT", "Lab"])(
    "%s can carry document attributes",
    (type) => {
      const event = ingestEvent({
        id: "d1",
        fields: {
          ...base,
          Event_Type: type,
          Event_UID: "d1",
          Event_Details: "text",
          QoL_Physical: 3,
          Symptom_Type: "Fatigue",
          Event_Measure_Type: "Creatinine",
          Numeric_Value: 1.1,
          TURBT_Histology: "Other",
          Lab_Flags: ["WBC_low"],
          Document_Type: "Lab Report",
          Document_Redaction_Status: "Redacted",
        },
      });
      expect(event.documentType).toBe("Lab Report");
      expect(event.documentRedactionStatus).toBe("Redacted");
    },
  );
});

describe("pathology and related events", () => {
  test("Pathology carries its report date", () => {
    const event = ingestEvent({
      id: "p1",
      fields: { ...base, Event_Type: "Pathology", Event_UID: "p1", Pathology_Report_Date: "2026-01-05", Pathology_Depth: "T1" },
    });
    expect(event.pathologyReportDate).toBe("2026-01-05");
    expect(event.pathologyDepth).toBe("T1");
  });

  test("any event can reference a related event", () => {
    const event = ingestEvent({
      id: "p2",
      fields: { ...base, Event_Type: "Pathology", Event_UID: "p2", Pathology_Grade: "High-grade", Event_Related_UID: "t1", Event_Relationship: "Produced_By" },
    });
    expect(event.relatedEventUid).toBe("t1");
    expect(event.eventRelationship).toBe("Produced_By");
  });

  test("rejects a relationship the schema does not define", () => {
    expect(() =>
      ingestEvent({ id: "p3", fields: { ...base, Event_Type: "Note", Event_Details: "x", Event_Relationship: "Bogus" } }),
    ).toThrow("Event fields failed schema validation");
  });
});
