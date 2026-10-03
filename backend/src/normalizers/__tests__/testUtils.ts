import {
  RawEventRecord,
  EventNormalizer,
  UnifiedEvent,
} from "../../types/UnifiedEvents";

export function mockRecord(fields: Record<string, any> = {}): RawEventRecord {
  return {
    id: "rec123",
    fields,
  };
}

export function testNormalizer(
  name: string,
  normalizer: EventNormalizer,
  eventType: string,
  defaultSummary: string,
  fields: Record<string, any>,
  expected: Partial<UnifiedEvent>,
): void {
  describe(name, () => {
    test("maps event fields and leaves the input unchanged", () => {
      const raw = mockRecord(fields);
      const inputBefore = JSON.stringify(raw);
      const event = normalizer(raw);

      expect(event).toMatchObject({
        uid: fields.Event_UID || raw.id,
        masterId: fields.Master_ID || "",
        eventType,
        eventDate: fields.Event_Date || null,
        ...expected,
      });
      expect(event.payload).toBe(raw);
      expect(JSON.stringify(raw)).toBe(inputBefore);
    });

    test("uses core defaults when fields are absent", () => {
      const raw = mockRecord();
      const inputBefore = JSON.stringify(raw);
      const event = normalizer(raw);

      expect(event).toMatchObject({
        uid: raw.id,
        masterId: "",
        eventType,
        eventDate: null,
        eventSummary: defaultSummary,
      });
      expect(event.payload).toBe(raw);
      expect(JSON.stringify(raw)).toBe(inputBefore);
    });
  });
}