import { describe, expect, it } from "vitest";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { assessCompleteResponse, COMPLETE_RESPONSE_CONFIRMED, describeCompleteResponse } from "../completeResponse";

function event(uid: string, eventType: string, eventDate: string | null, extra: Partial<UnifiedEvent> = {}): UnifiedEvent {
  return { uid, masterId: "M1", eventType, eventDate, payload: { id: uid, fields: {} }, ...extra };
}

const confirmed = (uid: string, eventDate: string | null) =>
  event(uid, "Decision", eventDate, { decisionType: COMPLETE_RESPONSE_CONFIRMED });

describe("assessCompleteResponse", () => {
  it("is null when no complete response decision is recorded", () => {
    expect(assessCompleteResponse([], "2027-01-01")).toBeNull();
    expect(assessCompleteResponse([event("r", "Treatment_Response", "2026-09-01")], "2027-01-01")).toBeNull();
    expect(assessCompleteResponse([event("d", "Decision", "2026-09-01", { decisionType: "Hold treatment" })], "2027-01-01")).toBeNull();
  });

  it("ignores a confirmation with no date, since its position is unknown", () => {
    expect(assessCompleteResponse([confirmed("cr", null)], "2027-01-01")).toBeNull();
  });

  it("is ongoing, with the days elapsed to the date given, when no Recurrence or Progression is recorded", () => {
    const result = assessCompleteResponse([confirmed("cr", "2026-10-01")], "2027-01-09");

    expect(result).toMatchObject({ status: "ongoing", asOf: "2027-01-09", elapsedDays: 100 });
    expect(result?.confirmation.uid).toBe("cr");
  });

  it("never reports negative elapsed time for a confirmation dated after the date given", () => {
    expect(assessCompleteResponse([confirmed("cr", "2027-02-01")], "2027-01-01")).toMatchObject({ elapsedDays: 0 });
  });

  it("ends at the first Recurrence or Progression after the confirmation", () => {
    const result = assessCompleteResponse(
      [confirmed("cr", "2026-10-01"), event("late", "Progression", "2027-05-01"), event("first", "Recurrence", "2027-03-02")],
      "2028-01-01",
    );

    expect(result).toMatchObject({ status: "ended", days: 152 });
    expect(result?.status === "ended" && result.endedBy.uid).toBe("first");
  });

  it("counts a finding on the day of the confirmation, but not one before it", () => {
    expect(assessCompleteResponse([confirmed("cr", "2026-10-01"), event("same", "Recurrence", "2026-10-01")], "2027-01-01")).toMatchObject({ status: "ended", days: 0 });
    expect(assessCompleteResponse([confirmed("cr", "2026-10-01"), event("before", "Progression", "2026-09-01")], "2027-01-01")).toMatchObject({ status: "ongoing" });
  });

  it("uses the earliest confirmation, and an undated finding is never used", () => {
    const result = assessCompleteResponse(
      [confirmed("second", "2026-12-01"), confirmed("first", "2026-10-01"), event("unknown", "Recurrence", null)],
      "2027-01-09",
    );

    expect(result?.confirmation.uid).toBe("first");
    expect(result).toMatchObject({ status: "ongoing", elapsedDays: 100 });
  });

  it("follows an edit of the confirmation date, whatever definition of complete response was applied", () => {
    const events = [event("progression", "Progression", "2027-06-01")];

    expect(assessCompleteResponse([confirmed("cr", "2026-10-01"), ...events], "2028-01-01")).toMatchObject({ days: 243 });
    expect(assessCompleteResponse([confirmed("cr", "2026-07-01"), ...events], "2028-01-01")).toMatchObject({ days: 335 });
  });

  it("does not change the events it is given", () => {
    const events = [confirmed("b", "2026-12-01"), confirmed("a", "2026-10-01")];
    const before = JSON.stringify(events);
    assessCompleteResponse(events, "2027-01-01");

    expect(JSON.stringify(events)).toBe(before);
  });

  it("describes each outcome without claiming more than is recorded", () => {
    expect(describeCompleteResponse(null)).toMatch(/No decision confirming a complete response/);
    expect(describeCompleteResponse(assessCompleteResponse([confirmed("cr", "2026-10-01")], "2027-01-09"))).toBe(
      "Complete response confirmed on 2026-10-01: 100 days elapsed to 2027-01-09, with no Progression or Recurrence recorded since. This is elapsed time, not a record that the response has held.",
    );
    expect(describeCompleteResponse(assessCompleteResponse([confirmed("cr", "2026-10-01"), event("p", "Progression", "2027-03-02")], "2028-01-01"))).toBe(
      "Complete response confirmed on 2026-10-01. The first Progression recorded after it is on 2027-03-02, 152 days later.",
    );
  });
});
