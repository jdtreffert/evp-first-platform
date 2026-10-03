import { normalizerRegistry } from "../../normalizers/normalizerRegistry";
import { mockRecord } from "../../normalizers/__tests__/testUtils";
import { UnifiedEvent } from "../../types/UnifiedEvents";
import { validateEvent } from "../validationService";

const validEvent = (): UnifiedEvent => ({
  uid: "E1",
  masterId: "M1",
  eventType: "Note",
  eventDate: "2024-01-01",
  payload: { id: "rec1", fields: {} },
});

describe("validateEvent", () => {
  test("accepts a minimal valid event", () => {
    expect(validateEvent(validEvent())).toEqual({ valid: true, errors: [] });
  });

  test("accepts a null eventDate", () => {
    expect(validateEvent({ ...validEvent(), eventDate: null }).valid).toBe(true);
  });

  test.each(Object.keys(normalizerRegistry))(
    "output of the %s normalizer is valid",
    (type) => {
      const raw = mockRecord({
        Master_ID: "M1",
        Event_Date: "2024-01-01",
        Treatment_Start_Date: "2024-01-01",
      });
      const event = normalizerRegistry[type](raw);
      expect(validateEvent(event)).toEqual({ valid: true, errors: [] });
    },
  );

  test("rejects non-objects", () => {
    expect(validateEvent(null).valid).toBe(false);
    expect(validateEvent("x").valid).toBe(false);
  });

  test("reports every problem with its field path", () => {
    const result = validateEvent({
      ...validEvent(),
      uid: "bad uid",
      masterId: "",
      eventType: "Bogus",
      eventDate: "2024-02-30",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.path).sort()).toEqual(
      ["eventDate", "eventType", "masterId", "uid"],
    );
  });

  test("reports missing required fields", () => {
    const result = validateEvent({});
    expect(result.errors.map((e) => e.path)).toEqual(
      expect.arrayContaining(["uid", "masterId", "eventType", "eventDate", "payload"]),
    );
  });

  test("rejects wrongly typed field values", () => {
    const result = validateEvent({ ...validEvent(), ctDNAValue: "1.2", labFlags: "x", qolPain: Infinity });
    expect(result.errors.map((e) => e.path).sort()).toEqual(["ctDNAValue", "labFlags", "qolPain"]);
  });

  test("accepts zero for numeric fields", () => {
    expect(validateEvent({ ...validEvent(), ctDNAValue: 0, qolPain: 0 }).valid).toBe(true);
  });

  test("rejects unknown fields", () => {
    const result = validateEvent({ ...validEvent(), surprise: 1 });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/surprise/);
  });

  test("rejects an invalid payload", () => {
    const result = validateEvent({ ...validEvent(), payload: { id: "" } });
    expect(result.errors.map((e) => e.path)).toEqual(
      expect.arrayContaining(["payload.id", "payload.fields"]),
    );
  });
});
