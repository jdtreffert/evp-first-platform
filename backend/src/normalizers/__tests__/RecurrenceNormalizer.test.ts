import { normalizeRecurrence } from "../RecurrenceNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeRecurrence",
  normalizeRecurrence,
  "Recurrence",
  "Recurrence event",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Recurrence_Location: "Bladder",
    Recurrence_Spread_Category: "Local",
    Recurrence_Modality: "Cystoscopy",
    Recurrence_Confirmation: "Biopsy-confirmed",
    Recurrence_Notes: "Localized recurrence",
  },
  {
    eventSummary: "Recurrence: Bladder",
    recurrenceLocation: "Bladder",
    recurrenceSpreadCategory: "Local",
    recurrenceModality: "Cystoscopy",
    recurrenceConfirmation: "Biopsy-confirmed",
    recurrenceNotes: "Localized recurrence",
    eventDetails: {
      recurrenceLocation: "Bladder",
      recurrenceSpreadCategory: "Local",
      recurrenceModality: "Cystoscopy",
      recurrenceConfirmation: "Biopsy-confirmed",
      recurrenceNotes: "Localized recurrence",
    },
  },
);
