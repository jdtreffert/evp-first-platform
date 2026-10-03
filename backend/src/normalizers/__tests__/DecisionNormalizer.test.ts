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
    Decision_Notes: "Proceed with planned treatment",
  },
  {
    eventSummary: "Decision: Treatment (Unanimous)",
    decisionType: "Treatment",
    decisionConsensus: "Unanimous",
    decisionNotes: "Proceed with planned treatment",
    eventDetails: {
      decisionType: "Treatment",
      decisionConsensus: "Unanimous",
      decisionNotes: "Proceed with planned treatment",
    },
  },
);
