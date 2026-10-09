import { ingestEvent } from "../../services/ingestionService";
import { normalizeTreatment } from "../TreatmentNormalizer";
import { normalizeTreatmentDelivery } from "../TreatmentDeliveryNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeTreatmentDelivery",
  normalizeTreatmentDelivery,
  "Treatment_Delivery",
  "Treatment delivery",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2025-03-04",
    Treatment_Name: "Drug A",
    Treatment_Cycle: 3,
    Treatment_Route: "Intravenous",
    Treatment_Dose: 0,
    Treatment_Dose_Units: "mg/m2",
    Treatment_Delivery_Status: "Dose Reduced",
    Treatment_Delivery_Notes: "Held a week",
  },
  {
    eventSummary: "Treatment delivery: Drug A",
    treatmentName: "Drug A",
    treatmentCycle: 3,
    treatmentRoute: "Intravenous",
    treatmentDose: 0,
    treatmentDoseUnits: "mg/m2",
    treatmentDeliveryStatus: "Dose Reduced",
    treatmentDeliveryNotes: "Held a week",
  },
);

describe("Treatment_Delivery and the extended Treatment_Start", () => {
  const base = { Master_ID: "M1", Event_Date: "2025-03-04" };

  test("the Treatment dispatcher routes delivery fields to Treatment_Delivery", () => {
    const event = normalizeTreatment({ id: "d1", fields: { ...base, Event_UID: "d1", Treatment_Delivery_Status: "Delivered as Planned" } });
    expect(event.eventType).toBe("Treatment_Delivery");
  });

  test("Treatment_Start carries no route or planned dose", () => {
    const event = ingestEvent({
      id: "s1",
      fields: {
        ...base, Event_Type: "Treatment_Start", Event_UID: "s1", Treatment_Name: "Cisplatin", Treatment_Route: "Intravesical",
        Treatment_Regimen_Details: "80 mg weekly",
      },
    });
    expect(event).toMatchObject({ treatmentRegimenDetails: "80 mg weekly" });
    expect(event).not.toHaveProperty("treatmentRoute");
    expect(event).not.toHaveProperty("treatmentPlannedDose");
  });

  test("route, dose units and delivery status must be defined options and doses numbers", () => {
    for (const fields of [
      { Treatment_Route: "Nasal" },
      { Treatment_Dose_Units: "tablespoons" },
      { Treatment_Delivery_Status: "Maybe" },
      { Treatment_Dose: "a lot" },
    ]) {
      expect(() => ingestEvent({ id: "d2", fields: { ...base, Event_Type: "Treatment_Delivery", Event_UID: "d2", ...fields } })).toThrow();
    }
  });
});

describe("recommendation and preference live on Decision, not Treatment_Start", () => {
  test("Treatment_Start no longer reads them", () => {
    const event = ingestEvent({
      id: "s2",
      fields: {
        Master_ID: "M1", Event_Date: "2025-03-04", Event_Type: "Treatment_Start", Event_UID: "s2", Treatment_Name: "Cisplatin",
        Treatment_Physician_Recommendation: "x",
      },
    });
    expect(event).not.toHaveProperty("treatmentPhysicianRecommendation");
  });
});
