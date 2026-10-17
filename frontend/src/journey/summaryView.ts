import type { Encounter } from "../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../backend/src/types/UnifiedEvents";
import { calendarDay, daysBetween, describeElapsed } from "./calendarDay";
import type { DiagnosisPhaseOptions } from "./diagnosisPhase";
import { formatLongDay, summarizeDiseaseStatus } from "./diseaseStatus";
import type { DiseaseStatusSummary } from "./diseaseStatus";
import { composePhase } from "./phaseView";
import type { EncounterConnector, PhaseLanes, PhaseReference, PhaseSpan, ViewEvent } from "./phaseView";
import { SUMMARY_LANES, summaryLabel, summaryPresentationFor } from "./presentationPolicy";
import { currentEvents, selectSummaryAnchors, selectSummaryEvents } from "./summarySelection";
import type { AnchorUnavailableReason, SummaryAnchor } from "./summarySelection";

export const SUMMARY_TITLE = "Journey Summary";

export interface SummaryOptions extends DiagnosisPhaseOptions {
  /** The date the durations are measured to, YYYY-MM-DD. Always given by the caller, so the view never reads the clock. */
  today: string;
}

export type SummaryAnchorRole = "diagnosis" | "treatment-start" | "treatment-completion";

/** A Summary milestone: the event as presented, and what is on record about it. The event itself is never copied. */
export interface SummaryMilestone {
  view: ViewEvent;
  /** Set when this event is the one a duration is measured from. */
  anchor: SummaryAnchorRole | null;
  provenance: {
    source: string | null;
    recordedAt: string | null;
    recordedByRole: string | null;
    lastModifiedAt: string | null;
    lastModifiedByRole: string | null;
    /** True when the event carries a source or server-set provenance to show. */
    available: boolean;
  };
  documents: { count: number; type: string | null; available: boolean };
  /** The one related event and the relationship recorded with it, if any. */
  relatedEventUid: string | null;
  relationship: string | null;
  /** The recorded Encounter_UID, if any. Membership is never inferred. */
  encounterUid: string | null;
}

export type SummaryDurationId = "since-diagnosis" | "since-treatment-start" | "since-treatment-completion";

export type DurationUnavailableReason = AnchorUnavailableReason | "anchor-after-today";

/**
 * A derived duration from an authoritative milestone to today. It keeps where it came from, so it is traceable:
 * the source event and its date, the date it is measured to, and whether it could be calculated.
 */
export interface SummaryDuration {
  id: SummaryDurationId;
  /** For example "Time since Diagnosis". */
  label: string;
  /** The milestone measured from, for example "Diagnosis". */
  anchorLabel: string;
  status: "available" | "unavailable";
  reason: DurationUnavailableReason | null;
  sourceEventUid: string | null;
  sourceEventDate: string | null;
  /** The date measured to (today). */
  endpoint: string;
  days: number | null;
  /** The elapsed time in words, or null when unavailable. */
  text: string | null;
}

export interface SummaryView extends PhaseLanes {
  title: typeof SUMMARY_TITLE;
  /** The present-date endpoint. It is a point in time, not a clinical event and not a status. */
  today: { day: string };
  /** The Today line. Always present in the Summary. */
  references: PhaseReference[];
  /** One arrow to today for each duration that could be calculated, in the order Diagnosis, Treatment Start, Treatment Completion. */
  spans: PhaseSpan[];
  /** Every placed milestone, earliest first. The lanes hold the same events as presented. */
  milestones: SummaryMilestone[];
  anchors: { diagnosis: SummaryAnchor; treatmentStart: SummaryAnchor; treatmentCompletion: SummaryAnchor };
  durations: SummaryDuration[];
  /** The latest recorded Disease_Status over the whole record, or "not recorded"; never inferred. */
  diseaseStatus: DiseaseStatusSummary;
  /** Summary events with a missing or invalid date. They are never placed. */
  undated: UnifiedEvent[];
  /** True when there is no milestone to draw. */
  empty: boolean;
}

const ANCHORS: { id: SummaryDurationId; key: keyof SummaryView["anchors"]; role: SummaryAnchorRole; anchorLabel: string }[] = [
  { id: "since-diagnosis", key: "diagnosis", role: "diagnosis", anchorLabel: "Diagnosis" },
  { id: "since-treatment-start", key: "treatmentStart", role: "treatment-start", anchorLabel: "Treatment Start" },
  { id: "since-treatment-completion", key: "treatmentCompletion", role: "treatment-completion", anchorLabel: "Treatment Completion" },
];

function durationFor(
  entry: (typeof ANCHORS)[number],
  anchor: SummaryAnchor,
  today: string,
): SummaryDuration {
  const base = { id: entry.id, label: `Time since ${entry.anchorLabel}`, anchorLabel: entry.anchorLabel, endpoint: today };
  if (anchor.status === "unavailable") {
    return { ...base, status: "unavailable", reason: anchor.reason, sourceEventUid: null, sourceEventDate: null, days: null, text: null };
  }
  const sourceEventDate = calendarDay(anchor.event.eventDate);
  const days = daysBetween(sourceEventDate, today);
  if (days < 0) {
    // The source is kept so the reason can be traced, but a negative time is never shown.
    return { ...base, status: "unavailable", reason: "anchor-after-today", sourceEventUid: anchor.event.uid, sourceEventDate, days: null, text: null };
  }
  return { ...base, status: "available", reason: null, sourceEventUid: anchor.event.uid, sourceEventDate, days, text: describeElapsed(sourceEventDate, today) };
}

const reasonText: Record<DurationUnavailableReason, (anchorLabel: string) => string> = {
  "no-event": (label) => `no ${label} is recorded`,
  "undated-event": (label) => `the recorded ${label} has no valid date`,
  "treatment-continued": () => "treatment was recorded as continuing after the Treatment completed",
  "anchor-after-today": (label) => `the ${label} is dated after today`,
};

/** A duration in words, always saying what it was measured from and to, or why it is not available. */
export function describeSummaryDuration(duration: SummaryDuration): string {
  if (duration.status === "unavailable") {
    return `${duration.label}: not available (${reasonText[duration.reason as DurationUnavailableReason](duration.anchorLabel)}).`;
  }
  return `${duration.label}: ${duration.text}, from the ${duration.anchorLabel} on ${formatLongDay(duration.sourceEventDate as string)} to ${formatLongDay(duration.endpoint)}.`;
}

/**
 * Builds the Journey Summary from a patient's events and encounters: the major milestones only, in two lanes,
 * ending at today, with the time since the Diagnosis, the Treatment Start and the Treatment Completion measured
 * from the recorded events. It reads event types, recorded fields and dates only. It never infers a milestone, an
 * anchor or a disease status (absence of a Disease_Status, Recurrence or Progression is not read as anything),
 * and it changes nothing it is given. Any journey, however sparse, gives a view; `empty` says when there is
 * nothing to draw. An encounter connector is included only when two or more milestones record the same
 * Encounter_UID.
 */
export function buildSummaryView(
  events: readonly UnifiedEvent[],
  encounters: readonly Encounter[],
  options: SummaryOptions,
): SummaryView {
  const today = calendarDay(options.today);
  if (today === "") throw new Error("The Summary needs today's date as YYYY-MM-DD");

  const current = currentEvents(events);
  const { milestones: selected, undated } = selectSummaryEvents(current);
  const anchors = selectSummaryAnchors(current, options);

  const { lanes, encounters: allConnectors, toViewEvent } = composePhase(selected, current, encounters, {
    lanes: SUMMARY_LANES,
    presentationOf: summaryPresentationFor,
    labelOf: summaryLabel,
  });
  const connectors: EncounterConnector[] = allConnectors.filter((connector) => connector.members.length >= 2);

  const anchorRoleByUid = new Map<string, SummaryAnchorRole>();
  for (const entry of ANCHORS) {
    const anchor = anchors[entry.key];
    if (anchor.status === "present") anchorRoleByUid.set(anchor.event.uid, entry.role);
  }

  const milestones: SummaryMilestone[] = selected.map((event) => ({
    view: toViewEvent(event),
    anchor: anchorRoleByUid.get(event.uid) ?? null,
    provenance: {
      source: event.eventSource ?? null,
      recordedAt: event.recordedAt ?? null,
      recordedByRole: event.recordedByRole ?? null,
      lastModifiedAt: event.lastModifiedAt ?? null,
      lastModifiedByRole: event.lastModifiedByRole ?? null,
      available: Boolean(event.eventSource || event.recordedAt),
    },
    documents: {
      count: (event.documentAttachment ?? []).length,
      type: event.documentType ?? null,
      available: (event.documentAttachment ?? []).length > 0,
    },
    relatedEventUid: event.relatedEventUid || null,
    relationship: event.relatedEventUid ? event.eventRelationship ?? null : null,
    encounterUid: event.encounterUid || null,
  }));

  const durations = ANCHORS.map((entry) => durationFor(entry, anchors[entry.key], today));
  const spans: PhaseSpan[] = durations
    .filter((duration) => duration.status === "available")
    .map((duration) => ({
      id: duration.id,
      fromDay: duration.sourceEventDate as string,
      toDay: duration.endpoint,
      label: `${duration.label}: ${duration.text}`,
    }));

  // The range covers every date drawn: the milestones, the encounters kept, and today.
  const days = [...milestones.map((milestone) => milestone.view.day), ...connectors.map((connector) => connector.day), today].sort();

  return {
    title: SUMMARY_TITLE,
    today: { day: today },
    lanes,
    encounters: connectors,
    range: { start: days[0], end: days[days.length - 1] },
    references: [{ day: today, label: "Today" }],
    spans,
    milestones,
    anchors,
    durations,
    diseaseStatus: summarizeDiseaseStatus(current),
    undated,
    empty: milestones.length === 0,
  };
}
