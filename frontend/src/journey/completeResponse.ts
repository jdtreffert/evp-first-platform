import type { UnifiedEvent } from "../../../backend/src/types/UnifiedEvents";
import { calendarDay, daysBetween } from "./calendarDay";

/** The Decision_Type recorded when the patient and care team confirm a complete response. */
export const COMPLETE_RESPONSE_CONFIRMED = "Complete response confirmed";

/** The recorded findings that end a complete response. */
const ENDING_EVENT_TYPES = ["Recurrence", "Progression"];

/**
 * The duration of complete response, measured from the recorded decision that confirms it. The platform does
 * not define a complete response: the date is whatever the patient and care team recorded, so a change of
 * definition is a change of that decision's date and the duration follows.
 */
export type CompleteResponse =
  | {
      status: "ended";
      /** The earliest "Complete response confirmed" decision. */
      confirmation: UnifiedEvent;
      /** The first Recurrence or Progression recorded on or after the confirmation. */
      endedBy: UnifiedEvent;
      days: number;
    }
  | {
      status: "ongoing";
      confirmation: UnifiedEvent;
      /** The date the elapsed time is measured to. */
      asOf: string;
      /** Days elapsed since the confirmation. This is elapsed time, not a record that the response held. */
      elapsedDays: number;
    };

function dayOf(event: UnifiedEvent): string {
  return calendarDay(event.eventDate);
}

function byDateThenUid(a: UnifiedEvent, b: UnifiedEvent): number {
  const dayA = dayOf(a);
  const dayB = dayOf(b);
  if (dayA !== dayB) return dayA < dayB ? -1 : 1;
  return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
}

/**
 * Finds the duration of complete response from a patient's current events, or null when no dated "Complete
 * response confirmed" decision is recorded. It ends at the first dated Recurrence or Progression on or after the
 * confirmation; with none recorded it is ongoing and reports the days elapsed to `asOf`, a YYYY-MM-DD date the
 * caller supplies so the result never depends on the clock. Absence of an event is not read as a negative
 * result, and relationships are not used. Undated events are never used.
 */
export function assessCompleteResponse(events: readonly UnifiedEvent[], asOf: string): CompleteResponse | null {
  const confirmation = events
    .filter((event) => event.eventType === "Decision" && event.decisionType === COMPLETE_RESPONSE_CONFIRMED && dayOf(event) !== "")
    .sort(byDateThenUid)[0];
  if (!confirmation) return null;

  const start = dayOf(confirmation);
  const endedBy = events
    .filter((event) => ENDING_EVENT_TYPES.includes(event.eventType) && dayOf(event) !== "" && dayOf(event) >= start)
    .sort(byDateThenUid)[0];
  if (endedBy) return { status: "ended", confirmation, endedBy, days: daysBetween(start, dayOf(endedBy)) };

  return { status: "ongoing", confirmation, asOf, elapsedDays: Math.max(0, daysBetween(start, asOf)) };
}

const plural = (count: number) => `${count} day${count === 1 ? "" : "s"}`;

/**
 * The plain-language statement of a duration of complete response. An ongoing one is described as elapsed time
 * with no later Recurrence or Progression recorded, never as a claim that the response held.
 */
export function describeCompleteResponse(response: CompleteResponse | null): string {
  if (!response) return "No decision confirming a complete response has been recorded, so no duration of complete response is shown.";
  const confirmedOn = calendarDay(response.confirmation.eventDate);
  if (response.status === "ended") {
    const type = response.endedBy.eventType;
    return `Complete response confirmed on ${confirmedOn}. The first ${type} recorded after it is on ${calendarDay(response.endedBy.eventDate)}, ${plural(response.days)} later.`;
  }
  return `Complete response confirmed on ${confirmedOn}: ${plural(response.elapsedDays)} elapsed to ${response.asOf}, with no Progression or Recurrence recorded since. This is elapsed time, not a record that the response has held.`;
}
