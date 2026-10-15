import type { ReactNode } from "react";
import type { EncounterGroup } from "../../journey/encounterGroups";
import DocumentLink from "../events/DocumentLink";
import { encounterLabel } from "../events/encounterOptions";

/**
 * Shows one encounter once, with its documents, above the events that link to it. The events themselves are
 * rendered by the caller so they keep their own cards, lanes or other presentation.
 */
export default function EncounterGroupCard({
  group,
  onEditEncounter,
  children,
}: {
  group: EncounterGroup;
  /** Present only when the signed-in user may edit encounters. */
  onEditEncounter?: () => void;
  children: ReactNode;
}) {
  const { encounter, events } = group;
  const documentIds = encounter.documentAttachment ?? [];

  return (
    <section className="rounded border border-sky-800 bg-gray-900 p-3" aria-label={`Encounter ${encounterLabel(encounter)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sky-300">Encounter</p>
          <h4 className="text-base font-semibold">{encounterLabel(encounter)}</h4>
          <p className="text-xs text-gray-400">
            {events.length} event{events.length === 1 ? "" : "s"}
          </p>
        </div>
        {onEditEncounter && (
          <button type="button" className="text-sm text-blue-300 underline" onClick={onEditEncounter}>
            Edit encounter
          </button>
        )}
      </div>

      {documentIds.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-400">
            Encounter documents{encounter.documentType ? ` (${encounter.documentType})` : ""}:
          </p>
          {documentIds.map((id) => <DocumentLink key={id} documentId={id} />)}
        </div>
      )}

      <div className="mt-3 space-y-3 border-l-2 border-sky-800 pl-3">{children}</div>
    </section>
  );
}
