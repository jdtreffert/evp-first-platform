import { normalizeQoL } from "../QoLNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeQoL",
  normalizeQoL,
  "QoL",
  "Quality of Life assessment",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-02",
    QoL_Physical: 4,
    QoL_Emotional: 3,
    QoL_Urinary: 2,
    QoL_Pain: 1,
    QoL_Fatigue: 2,
    QoL_Notes: "Symptoms improving",
  },
  {
    qolPhysical: 4,
    qolEmotional: 3,
    qolUrinary: 2,
    qolPain: 1,
    qolFatigue: 2,
    qolNotes: "Symptoms improving",
    eventDetails: {
      qolPhysical: 4,
      qolEmotional: 3,
      qolUrinary: 2,
      qolPain: 1,
      qolFatigue: 2,
      qolNotes: "Symptoms improving",
    },
  },
);
