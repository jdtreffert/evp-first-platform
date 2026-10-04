import { normalizeCtDNA } from "../ctDNANormalizer";
import { normalizeImagingResponse } from "../ImagingResponseNormalizer";
import { normalizeQoL } from "../QoLNormalizer";
import { normalizeSomatic } from "../SomaticNormalizer";
import { normalizeSymptom } from "../SymptomNormalizer";
import { normalizeTreatmentChange } from "../TreatmentChangeNormalizer";
import { normalizeTreatmentStart } from "../TreatmentStartNormalizer";
import { normalizeUtDNA } from "../utDNANormalizer";
import { mockRecord } from "./testUtils";

describe("numeric zero values are preserved, not converted to null", () => {
  test("ctDNA and utDNA", () => {
    expect(normalizeCtDNA(mockRecord({ ctDNA_Value: 0 })).ctDNAValue).toBe(0);
    expect(normalizeUtDNA(mockRecord({ utDNA_Value: 0 })).utDNAValue).toBe(0);
    expect(normalizeCtDNA(mockRecord({ ctDNA_Value: 0, ctDNA_Units: "MTM/mL" })).eventSummary)
      .toBe("ctDNA: 0 MTM/mL");
  });

  test("QoL scores", () => {
    const e = normalizeQoL(
      mockRecord({ QoL_Physical: 0, QoL_Emotional: 0, QoL_Urinary: 0, QoL_Pain: 0, QoL_Fatigue: 0 }),
    );
    expect([e.qolPhysical, e.qolEmotional, e.qolUrinary, e.qolPain, e.qolFatigue]).toEqual([0, 0, 0, 0, 0]);
  });

  test("symptom, somatic, treatment, imaging response values", () => {
    const s = normalizeSymptom(mockRecord({ Symptom_Severity: 0, Symptom_Duration: 0 }));
    expect([s.symptomSeverity, s.symptomDuration]).toEqual([0, 0]);
    expect(normalizeSomatic(mockRecord({ Somatic_PDL1_CPS: 0 })).somaticPDL1CPS).toBe(0);
    expect(normalizeTreatmentStart(mockRecord({ Treatment_Cycle: 0 })).treatmentCycle).toBe(0);
    expect(normalizeTreatmentChange(mockRecord({ Treatment_Change_Toxicity_Grade: 0 }))
      .treatmentChangeToxicityGrade).toBe(0);
    expect(normalizeImagingResponse(mockRecord({ Imaging_Response_Target_Lesion_Change: 0 }))
      .imagingResponseTargetLesionChange).toBe(0);
  });

  test("absent values are still null", () => {
    expect(normalizeCtDNA(mockRecord()).ctDNAValue).toBeNull();
    expect(normalizeQoL(mockRecord()).qolPain).toBeNull();
  });
});
