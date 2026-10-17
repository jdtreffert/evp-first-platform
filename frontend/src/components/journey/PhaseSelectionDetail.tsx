import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import EventCard from "../events/EventCard";
import { encounterLabel } from "../events/encounterOptions";
import type { EncounterConnector, ViewEvent } from "../../journey/phaseView";
import EncounterGroupCard from "./EncounterGroupCard";
import type { PhaseSelection } from "./PhaseTimeline";

/**
 * The details of what is selected in a phase timeline: an event's normal card (details, provenance,
 * documents, history, its encounter), or an encounter with its documents and its events in the phase.
 */
export default function PhaseSelectionDetail({
  selection,
  viewEvents,
  connectors,
  allEvents,
  onSelectEvent,
  scopeName = "phase",
}: {
  selection: PhaseSelection;
  viewEvents: readonly ViewEvent[];
  connectors: readonly EncounterConnector[];
  /** Every event of the patient, to resolve a related event even when it is outside the phase. */
  allEvents: readonly UnifiedEvent[];
  onSelectEvent: (uid: string) => void;
  /** What an encounter's other events fall outside of: "phase" in a phase view, "summary" in the Summary. */
  scopeName?: string;
}) {
  if (!selection) return null;

  if (selection.kind === "event") {
    const selected = viewEvents.find((item) => item.event.uid === selection.uid);
    if (!selected) return null;
    const relatedUid = selected.event.relatedEventUid;
    return (
      <EventCard
        event={selected.event}
        encounter={selected.encounter ?? undefined}
        related={relatedUid ? allEvents.find((other) => other.uid === relatedUid) : undefined}
      />
    );
  }

  const connector = connectors.find((candidate) => candidate.encounter.uid === selection.uid);
  if (!connector) return null;
  return (
    <EncounterGroupCard group={{ encounter: connector.encounter, events: connector.members.map((member) => member.event) }}>
      {connector.members.map((member) => (
        <button
          key={member.event.uid}
          type="button"
          className="block text-left text-sm text-blue-300 underline"
          onClick={() => onSelectEvent(member.event.uid)}
        >
          {member.day} · {member.presentation.label}{member.event.eventSummary ? ` · ${member.event.eventSummary}` : ""}
        </button>
      ))}
      {connector.outsideCount > 0 && (
        <p className="text-xs text-gray-400">
          {connector.outsideCount} more event{connector.outsideCount === 1 ? "" : "s"} in this encounter fall outside
          this {scopeName}.
        </p>
      )}
      <p className="text-xs text-gray-500">{encounterLabel(connector.encounter)}</p>
    </EncounterGroupCard>
  );
}
