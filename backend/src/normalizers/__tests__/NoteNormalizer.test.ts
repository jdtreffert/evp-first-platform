import { normalizeNote } from "../NoteNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeNote",
  normalizeNote,
  "Note",
  "Clinical note",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Note_Text: "Patient reports feeling well.",
  },
  {
    eventSummary: "Note: Patient reports feeling well....",
    noteText: "Patient reports feeling well.",
    eventDetails: { noteText: "Patient reports feeling well." },
  },
);
