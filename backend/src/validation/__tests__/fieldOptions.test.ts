import { eventFieldCatalog } from "../../schemas/eventFieldCatalog";
import { eventTypeFields } from "../../schemas/eventTypeFields";
import { normalizerRegistry } from "../../normalizers/normalizerRegistry";
import { ingestEvent } from "../../services/ingestionService";
import { validateFieldValues } from "../fieldOptions";

describe("validateFieldValues", () => {
  test("accepts schema options, multi-select arrays and numbers", () => {
    expect(
      validateFieldValues({
        Pathology_Depth: "T1",
        Diagnosis_Variant_Histology: ["Nested", "Other"],
        ctDNA_Value: 0,
        Event_Summary: "free text",
      }),
    ).toEqual([]);
  });

  test("rejects values outside the defined options", () => {
    const issues = validateFieldValues({ Pathology_Depth: "T9", Diagnosis_Variant_Histology: ["Nested", "Bogus"] });
    expect(issues.map((i) => i.path)).toEqual(["fields.Pathology_Depth", "fields.Diagnosis_Variant_Histology"]);
  });

  test("rejects non-numeric values in number fields", () => {
    expect(validateFieldValues({ Symptom_Severity: "high" })).toHaveLength(1);
  });

  test("ignores blank values and unknown fields", () => {
    expect(validateFieldValues({ Pathology_Depth: "", Unknown_Field: "x" })).toEqual([]);
  });
});

describe("schema catalog", () => {
  test("every event type with entry fields has a registered normalizer and known fields", () => {
    for (const [type, fields] of Object.entries(eventTypeFields)) {
      expect(normalizerRegistry[type]).toBeDefined();
      for (const field of fields) expect(eventFieldCatalog[field]).toBeDefined();
    }
  });

  test("select fields define options", () => {
    for (const def of Object.values(eventFieldCatalog)) {
      if (def.kind === "single" || def.kind === "multi") expect(def.options?.length).toBeGreaterThan(0);
    }
  });
});

describe("schema field names", () => {
  test("Pathology reads Pathology_* fields", () => {
    const event = ingestEvent({
      id: "t1",
      fields: {
        Event_Type: "TURBT",
        Event_UID: "t1",
        Master_ID: "M1",
        Event_Date: "2026-01-02",
        TURBT_Completeness: "Complete",
      },
    });
    const pathology = ingestEvent({
      id: "t2",
      fields: {
        Event_Type: "Pathology",
        Event_UID: "t2",
        Master_ID: "M1",
        Event_Date: "2026-01-02",
        Pathology_Histology: "Urothelial carcinoma",
        Pathology_Depth: "T1",
      },
    });
    expect(pathology.pathologyHistology).toBe("Urothelial carcinoma");
    expect(pathology.pathologyDepth).toBe("T1");
    expect(event.turbtCompleteness).toBe("Complete");
  });

  test("Diagnosis keeps TNM staging", () => {
    const event = ingestEvent({
      id: "d1",
      fields: { Event_Type: "Diagnosis", Event_UID: "d1", Master_ID: "M1", Event_Date: "2026-01-02", T: "T2", N: "N0", M: "M0", Stage: "Stage II" },
    });
    expect([event.tumorT, event.tumorN, event.tumorM, event.tumorStage]).toEqual(["T2", "N0", "M0", "Stage II"]);
  });

  test("ingestion rejects an option the schema does not define", () => {
    expect(() =>
      ingestEvent({ id: "x", fields: { Event_Type: "Pathology", Master_ID: "M1", Event_Date: "2026-01-02", Pathology_Depth: "T9" } }),
    ).toThrow("Event fields failed schema validation");
  });
});
