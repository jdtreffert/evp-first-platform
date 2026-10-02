import { normalizeLabs } from "../LabsNormalizer";
import { mockRecord } from "./testUtils";

test("normalizeLabs produces unified event", () => {
  const raw = mockRecord({
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2024-01-01",
    Lab_Flags: ["Sodium_high"],
    Lab_Values: "Sodium: 150\nPotassium: 3.2",
    Lab_Significance_Reasons: ["Critical value"],
    Lab_Notes: "Repeat test recommended",
  });

  const e = normalizeLabs(raw);

  expect(e.uid).toBe("E1");
  expect(e.masterId).toBe("M1");
  expect(e.eventType).toBe("Labs");
  expect(e.eventDate).toBe("2024-01-01");

  expect(e.eventSummary).toContain("Labs:");
  expect(e.labFlags).toContain("Sodium_high");

  // --- Fix: assert defined before dereferencing ---
  expect(e.labValues).toBeDefined();
  expect(e.labValues!.Sodium).toBe("150");

  expect(e.eventDetails).toBeDefined();
  expect(e.eventDetails!.labFlags).toEqual(e.labFlags);

  expect(e.payload).toBe(raw);
});
