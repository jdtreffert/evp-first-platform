import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Encounter } from "../../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { eventFieldCatalog } from "../../../../backend/src/schemas/eventFieldCatalog";
import { saveEncounter } from "../../api/encounters";
import { ACCEPTED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, listDocuments, uploadDocument } from "../../api/documents";
import type { DocumentMeta } from "../../api/documents";
import { ingestEvent, queryEventsByDates, queryEventsOfEncounter } from "../../api/events";
import { getLocalDate } from "./dates";
import DocumentLink from "./DocumentLink";
import {
  NEARBY_DAYS,
  candidateWindow,
  checklistEvents,
  eventDay,
  eventLabel,
  membershipChanges,
  unlinked,
  withEncounterLink,
} from "./encounterMembership";
import { buildEncounterRecord } from "./encounterOptions";
import type { EncounterDraft } from "./encounterOptions";

const inputClass = "mt-1 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white";

type Loaded = { key: string; events: UnifiedEvent[] | null } | null;

/**
 * Creates or edits an encounter and chooses which of the patient's events belong to it. Events on the same
 * date are only suggested; nothing is linked unless it is ticked. Saving updates each changed event through
 * the normal event edit, so every link change appears in that event's history.
 */
export default function EncounterForm({
  masterId,
  initial,
  onChanged,
  onClose,
}: {
  masterId: string;
  /** The encounter being edited; omitted when creating a new one. */
  initial?: Encounter;
  /** Called after anything was saved so the timeline can refresh. */
  onChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<EncounterDraft>(() => ({
    type: initial?.encounterType ?? "",
    date: initial ? initial.encounterDate.slice(0, 10) : getLocalDate(),
    summary: initial?.encounterSummary ?? "",
    documentIds: initial?.documentAttachment ?? [],
    documentType: initial?.documentType ?? "",
    redactionStatus: initial?.documentRedactionStatus ?? "",
  }));
  const [uid] = useState(() => initial?.uid ?? `enc-${crypto.randomUUID()}`);
  // Whether the encounter exists on the server, so its members can be loaded.
  const [stored, setStored] = useState(initial !== undefined);
  // The values last saved, so an unchanged encounter is not saved again (which would add a history entry).
  const lastSaved = useRef<string | null>(initial ? JSON.stringify(draft) : null);
  const [reloadCount, setReloadCount] = useState(0);
  const [nearby, setNearby] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Map<string, UnifiedEvent>>(new Map());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A new file is uploaded only when the encounter is saved; its id is kept so a retry does not upload it again.
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const uploaded = useRef<{ file: File; id: string } | null>(null);
  // The patient's stored documents, for "attach an existing document". undefined while loading, null on failure.
  const [existingDocuments, setExistingDocuments] = useState<DocumentMeta[] | null | undefined>(undefined);
  const documentIds = draft.documentIds ?? [];
  const attachableDocuments = (existingDocuments ?? []).filter((document) => !documentIds.includes(document.id));

  const membersKey = stored ? `${uid}|${reloadCount}` : null;
  const [loadedMembers, setLoadedMembers] = useState<Loaded>(null);
  // undefined while loading, null when the lookup failed.
  const members = membersKey === null ? [] : loadedMembers?.key === membersKey ? loadedMembers.events : undefined;

  const range = draft.date ? candidateWindow(draft.date, nearby) : null;
  const rangeFrom = range?.from;
  const rangeTo = range?.to;
  const candidatesKey = rangeFrom && rangeTo ? [masterId, rangeFrom, rangeTo, reloadCount].join("|") : null;
  const [loadedCandidates, setLoadedCandidates] = useState<Loaded>(null);
  const candidates = candidatesKey === null ? [] : loadedCandidates?.key === candidatesKey ? loadedCandidates.events : undefined;

  useEffect(() => {
    let active = true;
    listDocuments(masterId)
      .then((documents) => { if (active) setExistingDocuments(documents); })
      .catch(() => { if (active) setExistingDocuments(null); });
    return () => { active = false; };
  }, [masterId]);

  useEffect(() => {
    if (!membersKey) return;
    let active = true;
    queryEventsOfEncounter(masterId, uid)
      .then((events) => {
        if (!active) return;
        setLoadedMembers({ key: membersKey, events });
        setSelected(new Set(events.map((event) => event.uid)));
      })
      .catch(() => { if (active) setLoadedMembers({ key: membersKey, events: null }); });
    return () => { active = false; };
  }, [membersKey, masterId, uid]);

  useEffect(() => {
    if (!candidatesKey || !rangeFrom || !rangeTo) return;
    let active = true;
    queryEventsByDates(masterId, rangeFrom, rangeTo)
      .then((events) => { if (active) setLoadedCandidates({ key: candidatesKey, events }); })
      .catch(() => { if (active) setLoadedCandidates({ key: candidatesKey, events: null }); });
    return () => { active = false; };
  }, [candidatesKey, masterId, rangeFrom, rangeTo]);

  const memberList = members ?? [];
  const rows = checklistEvents(memberList, [...picked.values()], unlinked(candidates ?? []));
  const changes = membershipChanges(memberList.map((event) => event.uid), selected);

  const toggle = (event: UnifiedEvent) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(event.uid)) next.delete(event.uid);
      else next.add(event.uid);
      return next;
    });
    setPicked((previous) => new Map(previous).set(event.uid, event));
  };

  const handleSubmit = async (submitted: FormEvent<HTMLFormElement>) => {
    submitted.preventDefault();
    setError(null);
    if (draft.date === "") {
      setError("Enter the encounter date.");
      return;
    }
    if (members === undefined || members === null) {
      setError("The encounter's current events could not be loaded, so it cannot be changed safely. Try again.");
      return;
    }

    setSaving(true);
    try {
      // Upload first, so the encounter is saved with the new document already attached.
      let attachedIds = documentIds;
      if (file) {
        if (uploaded.current?.file !== file) {
          uploaded.current = { file, id: (await uploadDocument(file, masterId)).id };
        }
        attachedIds = [...new Set([...documentIds, uploaded.current.id])];
      }
      const finalDraft: EncounterDraft = { ...draft, documentIds: attachedIds };

      const key = JSON.stringify(finalDraft);
      if (lastSaved.current !== key) {
        try {
          await saveEncounter(buildEncounterRecord(uid, masterId, finalDraft));
        } catch (encounterError) {
          throw new Error(`The encounter could not be saved: ${
            encounterError instanceof Error ? encounterError.message : "unknown error"
          }`, { cause: encounterError });
        }
        lastSaved.current = key;
        setStored(true);
      }
      if (file) {
        setDraft(finalDraft);
        setFile(null);
        setFileInputKey((count) => count + 1);
      }

      const byUid = new Map(rows.map((event) => [event.uid, event]));
      const failures: string[] = [];
      const update = async (eventUid: string, link: string | null) => {
        const event = byUid.get(eventUid);
        if (!event) return;
        try {
          await ingestEvent(withEncounterLink(event, link));
        } catch (updateError) {
          failures.push(`${eventLabel(event)}: ${updateError instanceof Error ? updateError.message : "unknown error"}`);
        }
      };
      for (const eventUid of changes.toLink) await update(eventUid, uid);
      for (const eventUid of changes.toUnlink) await update(eventUid, null);

      await onChanged();
      if (failures.length === 0) {
        onClose();
        return;
      }
      setPicked(new Map());
      setReloadCount((count) => count + 1);
      setError(`Saved, but ${failures.length} event${failures.length === 1 ? "" : "s"} could not be updated: ${failures.join("; ")}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this encounter.");
    } finally {
      setSaving(false);
    }
  };

  const day = draft.date;

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 rounded-lg border border-gray-700 bg-gray-900 p-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold">{initial ? "Edit encounter" : "New encounter"}</h3>
        <button type="button" onClick={onClose} className="text-sm text-gray-300 hover:text-white">Cancel</button>
      </div>

      <label className="block text-sm">
        Encounter type
        <select className={inputClass} value={draft.type} onChange={(event) => setDraft((previous) => ({ ...previous, type: event.target.value }))}>
          <option value="">Not specified</option>
          {eventFieldCatalog.Encounter_Type.options?.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>

      <label className="block text-sm">
        Encounter date
        <input
          type="date"
          required
          className={inputClass}
          value={draft.date}
          onChange={(event) => setDraft((previous) => ({ ...previous, date: event.target.value }))}
        />
      </label>

      <label className="block text-sm">
        Encounter summary (optional)
        <input
          type="text"
          className={inputClass}
          value={draft.summary}
          onChange={(event) => setDraft((previous) => ({ ...previous, summary: event.target.value }))}
        />
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Documents for this encounter (optional)</legend>
        <p className="text-xs text-gray-400">
          For example a visit summary. Attached once here, it can be opened from every event in this encounter.
          Documents attached to individual events stay with those events.
        </p>
        {documentIds.map((id) => (
          <div key={id} className="flex flex-wrap items-center justify-between gap-3">
            <DocumentLink documentId={id} />
            <button
              type="button"
              className="text-sm text-rose-300 underline"
              onClick={() => setDraft((previous) => ({ ...previous, documentIds: (previous.documentIds ?? []).filter((item) => item !== id) }))}
            >
              Remove from encounter
            </button>
          </div>
        ))}

        <label className="block text-sm">
          Attach an existing document
          <select
            className={inputClass}
            value=""
            onChange={(event) => {
              const chosen = event.target.value;
              if (chosen) setDraft((previous) => ({ ...previous, documentIds: [...(previous.documentIds ?? []), chosen] }));
            }}
          >
            <option value="">
              {existingDocuments === undefined ? "Loading documents…" : existingDocuments === null ? "Unable to load documents" : attachableDocuments.length === 0 ? "No other documents stored" : "Choose a document…"}
            </option>
            {attachableDocuments.map((document) => (
              <option key={document.id} value={document.id}>
                {document.originalName} · uploaded {document.uploadedAt.slice(0, 10)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Attach a new file (PDF, PNG or JPEG, up to 25 MB)
          <input
            key={fileInputKey}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            className={inputClass}
            onChange={(event) => {
              const chosen = event.target.files?.[0] ?? null;
              if (chosen && (chosen.size > MAX_DOCUMENT_BYTES || (chosen.type && !ACCEPTED_DOCUMENT_TYPES.includes(chosen.type)))) {
                setError("Choose a PDF, PNG or JPEG file no larger than 25 MB.");
                event.target.value = "";
                setFile(null);
                return;
              }
              setError(null);
              setFile(chosen);
            }}
          />
        </label>

        <label className="block text-sm">
          Document type
          <select
            className={inputClass}
            value={draft.documentType ?? ""}
            onChange={(event) => setDraft((previous) => ({ ...previous, documentType: event.target.value }))}
          >
            <option value="">Not specified</option>
            {eventFieldCatalog.Document_Type.options?.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          Redaction status
          <select
            className={inputClass}
            value={draft.redactionStatus ?? ""}
            onChange={(event) => setDraft((previous) => ({ ...previous, redactionStatus: event.target.value }))}
          >
            <option value="">Not specified</option>
            {eventFieldCatalog.Document_Redaction_Status.options?.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Events in this encounter</legend>
        <p className="text-xs text-gray-400">
          Unlinked events on {day || "the encounter date"} are suggested here. Nothing is linked unless you tick it, and
          an event's own date is never changed.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={nearby} onChange={(event) => setNearby(event.target.checked)} />
          Also show unlinked events within {NEARBY_DAYS} days
        </label>

        {(members === undefined || candidates === undefined) && <p className="text-sm text-gray-400">Looking for events…</p>}
        {(members === null || candidates === null) && (
          <p className="text-sm text-rose-300">Unable to load some events. Close and reopen this form to try again.</p>
        )}
        {members !== undefined && candidates !== undefined && rows.length === 0 && (
          <p className="text-sm text-gray-400">No unlinked events found for this date.</p>
        )}

        <ul className="space-y-1">
          {rows.map((event) => {
            const isMember = memberList.some((member) => member.uid === event.uid);
            return (
              <li key={event.uid}>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={selected.has(event.uid)} onChange={() => toggle(event)} />
                  <span>
                    {eventLabel(event)}
                    {isMember && <span className="ml-2 text-xs text-gray-400">(currently in this encounter)</span>}
                    {!isMember && eventDay(event) === day && <span className="ml-2 text-xs text-emerald-300">(same date)</span>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : initial || stored ? "Save changes" : "Save encounter"}
        </button>
        <p className="text-xs text-gray-400">
          {changes.toLink.length} to link, {changes.toUnlink.length} to remove. Each change to an event is kept in its history.
        </p>
      </div>
    </form>
  );
}
