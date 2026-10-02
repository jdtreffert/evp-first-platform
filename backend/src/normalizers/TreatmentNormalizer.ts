// src/normalizers/TreatmentNormalizer.ts

import { normalizeTreatmentStart } from "./TreatmentStartNormalizer";
import { normalizeTreatmentChange } from "./TreatmentChangeNormalizer";
import { normalizeTreatmentResponse } from "./TreatmentResponseNormalizer";
import { normalizeTreatmentOutcome } from "./TreatmentOutcomeNormalizer";
import { normalizeTreatmentRegimenDetails } from "./TreatmentRegimenDetailsNormalizer";

export function normalizeTreatment(rawEvent: any) {
  const f = rawEvent.fields;

  // Treatment Start
  if (f.Treatment_Start_Date || f.Treatment_Start_Reason) {
    return normalizeTreatmentStart(rawEvent);
  }

  // Treatment Change
  if (f.Treatment_Change_Reason || f.Treatment_Change_Date) {
    return normalizeTreatmentChange(rawEvent);
  }

  // Treatment Response
  if (f.Treatment_Response_Category || f.Treatment_Response_Date) {
    return normalizeTreatmentResponse(rawEvent);
  }

  // Treatment Outcome
  if (f.Treatment_Outcome || f.Treatment_Outcome_Date) {
    return normalizeTreatmentOutcome(rawEvent);
  }

  // Treatment Regimen Details
  if (f.Treatment_Regimen_Name || f.Treatment_Regimen_Type) {
    return normalizeTreatmentRegimenDetails(rawEvent);
  }

  throw new Error("Unknown Treatment subtype — no matching fields found");
}