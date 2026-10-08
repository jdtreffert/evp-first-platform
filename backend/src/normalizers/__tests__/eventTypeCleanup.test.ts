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

  test.each(["Note", "QoL", "Symptom", "TURBT", "Lab"])(
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
          Numeric_Units: "mg/dL",
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
  test("Pathology uses Event_Date as its report date", () => {
    const event = ingestEvent({
      id: "p1",
      fields: { ...base, Event_Type: "Pathology", Event_UID: "p1", Pathology_Depth: "T1" },
    });
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

describe("optional event measure", () => {
  const note = { ...base, Event_Type: "Note", Event_UID: "m1", Event_Details: "x" };

  test("Event_Measure is no longer an event type", () => {
    expect("Event_Measure" in normalizerRegistry).toBe(false);
  });

  test("any event can carry one measurement with free-text units", () => {
    const event = ingestEvent({ id: "m1", fields: { ...note, Event_Measure_Type: "Tumor size", Numeric_Value: 0, Numeric_Units: "cm" } });
    expect([event.eventMeasureType, event.eventMeasureValue, event.eventMeasureUnits]).toEqual(["Tumor size", 0, "cm"]);
  });

  test("type and value must be given together", () => {
    expect(() => ingestEvent({ id: "m1", fields: { ...note, Event_Measure_Type: "PSA" } })).toThrow("schema validation");
    expect(() => ingestEvent({ id: "m1", fields: { ...note, Numeric_Value: 2 } })).toThrow("schema validation");
    expect(() => ingestEvent({ id: "m1", fields: { ...note, Numeric_Units: "ng/mL" } })).toThrow("schema validation");
  });

  test("rejects a measure type the schema does not define", () => {
    expect(() => ingestEvent({ id: "m1", fields: { ...note, Event_Measure_Type: "Bogus", Numeric_Value: 1 } })).toThrow("schema validation");
  });
});

describe("server-owned provenance fields", () => {
  test("client-supplied Event_Created_At is ignored", () => {
    const event = ingestEvent({
      id: "c1",
      fields: { ...base, Event_Type: "Note", Event_UID: "c1", Event_Details: "x", Event_Created_At: "2001-01-01T00:00:00Z", Event_ID: 7 },
    });
    expect(event.recordedAt).toBeUndefined();
    expect(event.payload.fields.Event_Created_At).toBeUndefined();
    expect(event.payload.fields.Event_ID).toBeUndefined();
  });
});

describe("Imaging contrast and region options", () => {
  test("accepts the new Imaging_Region and Imaging_Contrast options", () => {
    const event = ingestEvent({
      id: "i1",
      fields: { ...base, Event_Type: "Imaging", Event_UID: "i1", Imaging_Region: "Chest/Abdomen/Pelvis", Imaging_Contrast: "No Contrast", Imaging_Result: "x" },
    });
    expect(event.imagingRegion).toBe("Chest/Abdomen/Pelvis");
    expect(event.imagingContrast).toBe("No Contrast");
  });

  test("accepts the Whole Body region", () => {
    const event = ingestEvent({ id: "i4", fields: { ...base, Event_Type: "Imaging", Event_UID: "i4", Imaging_Modality: "PET/CT", Imaging_Region: "Whole Body", Imaging_Result: "x" } });
    expect(event.imagingRegion).toBe("Whole Body");
  });

  test("accepts the combined contrast options", () => {
    for (const contrast of ["IV and Oral Contrast", "With and Without Contrast"]) {
      const event = ingestEvent({ id: "i3", fields: { ...base, Event_Type: "Imaging", Event_UID: "i3", Imaging_Contrast: contrast, Imaging_Result: "x" } });
      expect(event.imagingContrast).toBe(contrast);
    }
  });

  test("rejects the retired CAP region and unknown contrast values", () => {
    for (const fields of [{ Imaging_Region: "CAP" }, { Imaging_Contrast: "Gadolinium" }]) {
      expect(() => ingestEvent({ id: "i2", fields: { ...base, Event_Type: "Imaging", Event_UID: "i2", ...fields } })).toThrow();
    }
  });
});
