import { AirtableRecord } from "../../types/UnifiedEvents";

export function mockRecord(fields: Record<string, any>): AirtableRecord {
  return {
    id: "rec123",
    fields,
  };
}