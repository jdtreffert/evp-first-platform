import { RawEventRecord } from "../types/UnifiedEvents";

export function detectEventType(raw: RawEventRecord): string | null {
  const type = raw.fields.Event_Type;
  return typeof type === "string" && type.trim() !== "" ? type.trim() : null;
}
