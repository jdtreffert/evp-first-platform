import { normalizeDecision } from "../DecisionNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeDecision",
  normalizeDecision,
  "Decision",
  "Clinical decision",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    Decision_Type: "Treatment",
    Decision_Consensus: "Unanimous",
    Decision_Physician_Recommendation: "Recommend bladder sparing",
    Decision_Patient_Preference: "Prefers bladder sparing",
    Decision_Notes: "Proceed with planned treatment",
  },
  {
    eventSummary: "Decision: Treatment (Unanimous)",
    decisionType: "Treatment",
    decisionConsensus: "Unanimous",
    decisionPhysicianRecommendation: "Recommend bladder sparing",
    decisionPatientPreference: "Prefers bladder sparing",
    decisionNotes: "Proceed with planned treatment",
    eventDetails: {
      decisionType: "Treatment",
      decisionConsensus: "Unanimous",
      decisionPhysicianRecommendation: "Recommend bladder sparing",
      decisionPatientPreference: "Prefers bladder sparing",
      decisionNotes: "Proceed with planned treatment",
    },
  },
);
