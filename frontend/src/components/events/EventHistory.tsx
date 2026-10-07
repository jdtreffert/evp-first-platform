import { useEffect, useState } from "react";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { getEventHistory } from "../../api/events";
import type { EventVersion } from "../../api/events";

const ignoredFields = new Set(["Event_UID", "Master_ID"]);

function show(value: unknown): string {
  if (value === undefined || value === null || value === "") return "(empty)";
  return Array.isArray(value) ? value.join(", ") : String(value);
}

function changes(before: UnifiedEvent, after: UnifiedEvent): string[] {
  const names = new Set([...Object.keys(before.payload.fields), ...Object.keys(after.payload.fields)]);
  return [...names]
    .filter((name) => !ignoredFields.has(name) && show(before.payload.fields[name]) !== show(after.payload.fields[name]))
    .map((name) => `${name.replaceAll("_", " ")}: ${show(before.payload.fields[name])} → ${show(after.payload.fields[name])}`);
}

export default function EventHistory({ event }: { event: UnifiedEvent }) {
  const [versions, setVersions] = useState<EventVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getEventHistory(event.uid)
      .then((value) => { if (active) setVersions(value); })
      .catch(() => { if (active) setError("Unable to load the history."); });
    return () => { active = false; };
  }, [event.uid, event.lastModifiedAt]);

  if (error) return <p className="mt-2 text-xs text-rose-300">{error}</p>;
  if (!versions) return <p className="mt-2 text-xs text-gray-400">Loading history…</p>;
  if (versions.length === 0) return <p className="mt-2 text-xs text-gray-400">This event has not been edited.</p>;

  // Each version was replaced by the next one; the last was replaced by the current event.
  const chain = [...versions.map((version) => version.event), event];
  return (
    <ol className="mt-2 space-y-2 text-xs text-gray-300">
      {versions.map((version, index) => (
        <li key={version.supersededAt} className="rounded border border-gray-700 p-2">
          <p className="text-gray-400">
            Edited {new Date(version.supersededAt).toLocaleString()} by {version.supersededByRole}
          </p>
          {changes(chain[index], chain[index + 1]).map((line) => <p key={line} className="whitespace-pre-line">{line}</p>)}
        </li>
      ))}
    </ol>
  );
}
