import { ingestEvent } from "../ingestionService";
import { HttpError } from "../../utils/httpError";

const record = (fields: Record<string, unknown>) => ({ id: "rec1", fields });

describe("ingestEvent", () => {
  test("normalizes a record using the registry entry for its Event_Type", () => {
    const input = record({ Event_Type: "Note", Event_UID: "E1", Note_Text: "hello" });
    const event = ingestEvent(input);

    expect(event.eventType).toBe("Note");
    expect(event.uid).toBe("E1");
    expect(event.payload).toEqual(input);
  });

  test("routes generic Treatment records to the matching subtype", () => {
    const event = ingestEvent(
      record({ Event_Type: "Treatment", Treatment_Start_Date: "2024-01-01" }),
    );
    expect(event.eventType).toBe("Treatment_Start");
  });

  test.each([[null], ["x"], [{ id: "r" }], [{ id: "", fields: {} }]])(
    "rejects malformed input %p with 400",
    (input) => {
      expect(() => ingestEvent(input)).toThrow(HttpError);
      try {
        ingestEvent(input);
      } catch (e) {
        expect((e as HttpError).status).toBe(400);
      }
    },
  );

  test("rejects a missing Event_Type with 400", () => {
    expect(() => ingestEvent(record({}))).toThrow("Missing Event_Type");
  });

  test.each([["Bogus"], ["toString"], ["__proto__"]])(
    "rejects unsupported type %s with 422",
    (type) => {
      try {
        ingestEvent(record({ Event_Type: type }));
        throw new Error("expected failure");
      } catch (e) {
        expect(e).toBeInstanceOf(HttpError);
        expect((e as HttpError).status).toBe(422);
      }
    },
  );
});
