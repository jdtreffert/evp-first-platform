import { ingestEvent } from "../../services/ingestionService";
import { normalizerRegistry } from "../normalizerRegistry";

const base = { Master_ID: "M1", Event_Date: "2026-01-02" };

describe("event type cleanup", () => {
  test.each(["Labs", "Treatment_Outcome", "Treatment_Regimen_Details"])("%s is no longer an event type", (type) => {
    expect(type in normalizerRegistry).toBe(false);
    expect(() => ingestEvent({ id: "x", fields: { ...base, Event_Type: type } })).toThrow("Unsupported event type");
  });

  test.each(["Treatment_Start", "Treatment_Change"])("%s carries regimen details", (type) => {
    const event = ingestEvent({
      id: "r1",
      fields: { ...base, Event_Type: type, Event_UID: "r1", Treatment_Name: "EVP", Treatment_Regimen_Details: "Days 1 and 8" },
    });
    expect(event.eventType).toBe(type);
    expect(event.treatmentRegimenDetails).toBe("Days 1 and 8");
  });

  test("Lab is accepted", () => {
    const event = ingestEvent({ id: "l1", fields: { ...base, Event_Type: "Lab", Event_UID: "l1", Lab_Flags: ["WBC_low"] } });
    expect(event.eventType).toBe("Lab");
  });
});
