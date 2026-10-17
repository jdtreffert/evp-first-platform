import type { UnifiedEvent } from "../../../backend/src/types/UnifiedEvents";
import { calendarDay } from "./calendarDay";
import { diseaseStatusLabel, eventTypeLabel } from "./presentationPolicy";

/**
 * The event types that count as assessment evidence when asking whether anything is newer than a recorded
 * Disease_Status. The list is only a temporal filter: it says nothing about what any of them show.
 */
export const ASSESSMENT_EVIDENCE_EVENT_TYPES: readonly string[] = [
  "Imaging",
  "Imaging_Response",
  "Cystoscopy",
  "Cystoscopy_Biopsy",
  "Cytology",
  "Pathology",
  "ctDNA",
  "utDNA",
  "Treatment_Response",
  "Recurrence",
  "Progression",
];

/** Event types shown as the latest milestone when no Disease_Status is recorded. */
const MILESTONE_EVENT_TYPES: readonly string[] = ["Treatment_Response", "Recurrence", "Progression"];

/**
 * The latest explicit Disease_Status assessment, exposing everything the Summary shows about it. It is read from
 * a recorded event and never derived: `category` and the other fields are exactly as recorded.
 */
export interface RecordedDiseaseStatus {
  status: "recorded";
  /** The assessment event itself, with its provenance, edit history fields and notes. */
  event: UnifiedEvent;
  /** The assessment date (the event's own calendar date), not a date the status is confirmed to hold at. */
  day: string;
  category: string | null;
  /** The display label for the category, or null when it is missing or not a recognised option. */
  categoryLabel: string | null;
  extent: string | null;
  basis: string | null;
  confidence: string | null;
  notes: string | null;
  source: string | null;
  /** The one supporting event the assessment names, if any, and the relationship recorded with it. */
  supportingEventUid: string | null;
  supportingEvent: UnifiedEvent | null;
  relationship: string | null;
  documentIds: string[];
  documentType: string | null;
  /**
   * Assessment evidence dated after the assessment, earliest first. Purely a temporal observation: it says
   * nothing about whether that evidence confirms or changes the status. Same-day evidence is not counted,
   * since the order within a day is unknown.
   */
  newerEvidence: UnifiedEvent[];
  /** Disease_Status events with no usable date. They are never taken as the latest. */
  undated: UnifiedEvent[];
}

/** No dated Disease_Status is recorded. Disease status is unknown, never read as "no evidence of disease". */
export interface NoDiseaseStatus {
  status: "not-recorded";
  /** The latest recorded Treatment_Response, Recurrence or Progression, shown as it is, or null. */
  latestMilestone: UnifiedEvent | null;
  undated: UnifiedEvent[];
}

export type DiseaseStatusSummary = RecordedDiseaseStatus | NoDiseaseStatus;

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
 * Finds the latest recorded Disease_Status from a patient's current events. It never creates or changes a
 * status: with none recorded the result is "not-recorded", whatever the other events show (a complete
 * response, negative tests, or no Recurrence or Progression do not make a status). It reads event types and
 * dates only, never notes or relationships to decide anything, and changes nothing it is given. Withdrawn
 * events are ignored.
 */
export function summarizeDiseaseStatus(events: readonly UnifiedEvent[]): DiseaseStatusSummary {
  const current = events.filter((event) => !event.withdrawnAt);
  const statuses = current.filter((event) => event.eventType === "Disease_Status");
  const undated = statuses.filter((event) => dayOf(event) === "").sort(byDateThenUid);
  const latest = statuses.filter((event) => dayOf(event) !== "").sort(byDateThenUid).pop();

  if (!latest) {
    const latestMilestone =
      current.filter((event) => MILESTONE_EVENT_TYPES.includes(event.eventType) && dayOf(event) !== "").sort(byDateThenUid).pop() ?? null;
    return { status: "not-recorded", latestMilestone, undated };
  }

  const day = dayOf(latest);
  const supportingUid = latest.relatedEventUid || null;
  return {
    status: "recorded",
    event: latest,
    day,
    category: latest.diseaseStatusCategory ?? null,
    categoryLabel: diseaseStatusLabel(latest.diseaseStatusCategory),
    extent: latest.diseaseStatusExtent ?? null,
    basis: latest.diseaseStatusBasis ?? null,
    confidence: latest.diseaseStatusConfidence ?? null,
    notes: latest.diseaseStatusNotes ?? null,
    source: latest.eventSource ?? null,
    supportingEventUid: supportingUid,
    supportingEvent: supportingUid ? current.find((event) => event.uid === supportingUid) ?? null : null,
    relationship: supportingUid ? latest.eventRelationship ?? null : null,
    documentIds: (latest.documentAttachment ?? []).map(String),
    documentType: latest.documentType ?? null,
    newerEvidence: current
      .filter((event) => ASSESSMENT_EVIDENCE_EVENT_TYPES.includes(event.eventType) && dayOf(event) > day)
      .sort(byDateThenUid),
    undated,
  };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** A YYYY-MM-DD date as "August 15, 2026". */
export function formatLongDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return `${MONTHS[month - 1]} ${date}, ${year}`;
}

/**
 * The plain-language statement of the disease status. It always says when the assessment was recorded and never
 * says the status holds now: an old assessment is described as recorded on its date, not as confirmed today. The
 * note about newer evidence is only that such events exist after the assessment date.
 */
export function describeDiseaseStatus(summary: DiseaseStatusSummary): string {
  if (summary.status === "not-recorded") {
    const milestone = summary.latestMilestone
      ? ` The latest ${eventTypeLabel(summary.latestMilestone.eventType)} recorded is on ${formatLongDay(dayOf(summary.latestMilestone))}.`
      : "";
    const undated = summary.undated.length > 0
      ? ` ${summary.undated.length} disease status event${summary.undated.length === 1 ? " has" : "s have"} no date and cannot be placed.`
      : "";
    return `Disease status: not recorded.${milestone}${undated}`;
  }

  const label = summary.categoryLabel ?? "Disease status recorded, with a category that is not recognised";
  const parts = [
    `Latest recorded disease status: ${label}.`,
    `Recorded ${formatLongDay(summary.day)}.`,
    summary.extent ? `Extent: ${summary.extent}.` : null,
    summary.basis ? `Basis: ${summary.basis}.` : null,
    summary.confidence ? `Confidence: ${summary.confidence}.` : null,
    summary.source ? `Source: ${summary.source}.` : null,
    summary.newerEvidence.length > 0
      ? `Newer assessment evidence exists (${summary.newerEvidence.length} event${summary.newerEvidence.length === 1 ? "" : "s"} dated after ${formatLongDay(summary.day)}).`
      : null,
  ];
  return parts.filter(Boolean).join(" ");
}
