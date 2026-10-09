// src/normalizers/TreatmentNormalizer.ts

import { RawEventRecord, UnifiedEvent } from "../types/UnifiedEvents";
import { normalizeTreatmentStart } from "./TreatmentStartNormalizer";
import { normalizeTreatmentDelivery } from "./TreatmentDeliveryNormalizer";
import { normalizeTreatmentChange } from "./TreatmentChangeNormalizer";
import { normalizeTreatmentResponse } from "./TreatmentResponseNormalizer";

/**
 * Dispatcher only: routes a generic Treatment record to Treatment_Start, Treatment_Delivery,
 * Treatment_Change or Treatment_Response from the fields present. Treatment is not stored as an event type.
 */
export function normalizeTreatment(rawEvent: RawEventRecord): UnifiedEvent {
  const f = rawEvent.fields;

  if (f.Treatment_Start_Date || f.Treatment_Start_Reason) {
    return normalizeTreatmentStart(rawEvent);
  }

  if (
    f.Treatment_Change_Type || f.Treatment_Change_Reason || f.Treatment_Change_New_Regimen ||
    f.Treatment_Change_Toxicity_Grade !== undefined || f.Treatment_Change_Date
  ) {
    return normalizeTreatmentChange(rawEvent);
  }

  if (
    f.Treatment_Response_Category || f.Treatment_Response_Modality || f.Treatment_Response_Notes ||
    f.Treatment_Response_Date
  ) {
    return normalizeTreatmentResponse(rawEvent);
  }

  if (
    f.Treatment_Delivery_Status || f.Treatment_Delivery_Notes || f.Treatment_Dose !== undefined ||
    f.Treatment_Dose_Units
  ) {
    return normalizeTreatmentDelivery(rawEvent);
  }

  if (f.Treatment_Name || f.Treatment_Cycle !== undefined || f.Treatment_Intent) {
    return normalizeTreatmentStart(rawEvent);
  }

  throw new Error("Unknown Treatment subtype — no matching fields found");
}
