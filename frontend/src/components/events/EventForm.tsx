import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { RawEventRecord, UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { eventFieldCatalog } from "../../../../backend/src/schemas/eventFieldCatalog";
import type { FieldDefinition } from "../../../../backend/src/schemas/eventFieldCatalog";
import { ACCEPTED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, uploadDocument } from "../../api/documents";
import DocumentLink from "./DocumentLink";
import { queryEventsInRange } from "../../api/events";
import { documentFields, eventTypeFields, measureFields, relatedEventCandidates, relationshipFields } from "../../../../backend/src/schemas/eventTypeFields";

const eventTypeLabels: Record<string, string> = {
  QoL: "Quality of life",
  Lab: "Lab work",
  Imaging_Response: "Imaging response",
  Cystoscopy_Biopsy: "Cystoscopy biopsy",
};

const fieldLabels: Record<string, string> = {
  T: "T (tumor)",
  N: "N (nodes)",
  M: "M (metastasis)",
  Treatment_Name: "Treatment",
  Pathology_LVI: "Lymphovascular invasion (LVI)",
  TURBT_Surgeon_Notes: "Surgeon notes",
  Event_Related_UID: "Related event ID",
  Event_Relationship: "Relationship",
  Imaging_ComparisonToPrior: "Comparison to prior",
  Imaging_Response_Critera: "Response criteria",
  Imaging_Response_Target_Lesion_Change: "Target lesion change",
  Somatic_PD_L1_CPS: "PD-L1 CPS",
  Somatic_ERBB2_Expression: "ERBB2 expression",
  Lab_Values: "Values (one “name: value” per line)",
  Numeric_Value: "Value",
  Numeric_Units: "Units",
  Event_Measure_Type: "Measure type",
  Event_Source: "Source",
  Event_Date: "Event date",
  Document_Type: "Document type",
  Document_Redaction_Status: "Redaction status",
};

// Attachments cannot be uploaded yet, so only the optional document attributes are offered.
const linkableDocumentFields = documentFields.filter((name) => name !== "Document_Attachment");

const placeholders: Record<string, string> = {
  Lab_Values: "Creatinine: 1.1\nHemoglobin: 13.2",
};

const requiredFields: Record<string, string> = { Event_Details: "Details" };

const inputClass = "mt-1 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white";

function labelFor(name: string): string {
  return fieldLabels[name] ?? name.replace(/^[A-Za-z0-9]+_/, "").replaceAll("_", " ");
}

function typeLabel(type: string): string {
  return eventTypeLabels[type] ?? type.replaceAll("_", " ");
}

function getLocalDate(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function shiftDate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/** Form values for a stored event, read from the raw record it was created from. */
function valuesFromEvent(event: UnifiedEvent): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};
  for (const [name, value] of Object.entries(event.payload.fields)) {
    const definition = Object.prototype.hasOwnProperty.call(eventFieldCatalog, name) ? eventFieldCatalog[name] : undefined;
    if (!definition || value === null || value === undefined || value === "") continue;
    if (definition.kind === "multi") values[name] = Array.isArray(value) ? value.map(String) : [String(value)];
    else if (definition.kind !== "attachment") values[name] = String(value);
  }
  return values;
}

function isFilled(value: string | string[] | undefined): boolean {
  return Array.isArray(value) ? value.length > 0 : (value ?? "").trim() !== "";
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}) {
  const label = labelFor(field.name);

  if (field.kind === "multi") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="text-sm">
        <legend>{label}</legend>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {field.options?.map((option) => (
            <label key={option} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={(event) =>
                  onChange(event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))
                }
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  const text = typeof value === "string" ? value : "";

  return (
    <label className="block text-sm">
      {label}
      {field.kind === "single" ? (
        <select className={inputClass} value={text} onChange={(event) => onChange(event.target.value)}>
          <option value="">Not specified</option>
          {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : field.kind === "longText" ? (
        <textarea
          required={field.name in requiredFields}
          className={inputClass}
          rows={4}
          placeholder={placeholders[field.name]}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"}
          step={field.kind === "number" ? "any" : undefined}
          className={inputClass}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

export default function EventForm({
  masterId,
  defaultSource,
  initial,
  onSave,
  onCancel,
}: {
  masterId: string;
  defaultSource: string;
  /** The stored event being edited; omitted when adding a new event. */
  initial?: UnifiedEvent;
  onSave: (event: RawEventRecord) => Promise<void>;
  onCancel: () => void;
}) {
  const [eventType, setEventType] = useState(initial?.eventType ?? "Note");
  const [eventDate, setEventDate] = useState(() => initial?.eventDate?.slice(0, 10) ?? getLocalDate());
  const [source, setSource] = useState(initial?.eventSource ?? defaultSource);
  const [values, setValues] = useState<Record<string, string | string[]>>(() => (initial ? valuesFromEvent(initial) : {}));
  const [file, setFile] = useState<File | null>(null);
  const uploaded = useRef<{ file: File; id: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldNames = eventTypeFields[eventType];
  const sourceField = eventFieldCatalog.Event_Source;

  const candidateRule = relatedEventCandidates[eventType];
  const candidateKey = candidateRule && eventDate ? [masterId, eventType, eventDate].join("|") : null;
  const [loaded, setLoaded] = useState<{ key: string; events: UnifiedEvent[] | null } | null>(null);
  // undefined while loading for the current type and date, null when the lookup failed.
  const candidates = loaded && loaded.key === candidateKey ? loaded.events : undefined;

  useEffect(() => {
    if (!candidateRule || !candidateKey) return;
    let active = true;
    const from = shiftDate(eventDate, -candidateRule.withinDays);
    const to = shiftDate(eventDate, candidateRule.withinDays);
    Promise.all(candidateRule.eventTypes.map((type) => queryEventsInRange(masterId, type, from, to)))
      .then((groups) => { if (active) setLoaded({ key: candidateKey, events: groups.flat() }); })
      .catch(() => { if (active) setLoaded({ key: candidateKey, events: null }); });
    return () => { active = false; };
  }, [candidateKey, candidateRule, eventDate, masterId]);

  const changeType = (type: string) => {
    setEventType(type);
    setValues({});
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const missing = fieldNames.find((name) => name in requiredFields && !isFilled(values[name]));
    if (missing) {
      setError(`${requiredFields[missing]} is required.`);
      return;
    }
    if (!fieldNames.some((name) => isFilled(values[name]))) {
      setError("Enter at least one event detail before saving.");
      return;
    }

    // An edit starts from the stored record so nothing the form does not manage is lost.
    const fields: Record<string, unknown> = {
      ...(initial?.payload.fields ?? {}),
      Event_UID: initial?.uid ?? `web-${crypto.randomUUID()}`,
      Event_Type: eventType,
      Event_Date: eventDate,
      Event_Source: source,
      Master_ID: masterId,
    };

    const relatedUid = values.Event_Related_UID;
    const relatedChosen = typeof relatedUid === "string" && (candidates ?? []).some((candidate) => candidate.uid === relatedUid);
    const keepsExistingLink = initial !== undefined && relatedUid === initial.relatedEventUid;
    const optionalFields = [...linkableDocumentFields, ...(relatedChosen || keepsExistingLink ? relationshipFields : []), ...measureFields];
    // Cleared fields must be removed from the record rather than left at their old value.
    for (const name of [...fieldNames, ...optionalFields, ...relationshipFields]) delete fields[name];
    for (const name of [...fieldNames, ...optionalFields]) {
      const value = values[name];
      if (!isFilled(value)) continue;
      fields[name] = eventFieldCatalog[name].kind === "number" ? Number(value) : Array.isArray(value) ? value : value?.trim();
    }

    setSaving(true);
    try {
      if (file) {
        // Reuse the upload when the user retries after a failed save, so the file is not stored twice.
        if (uploaded.current?.file !== file) {
          uploaded.current = { file, id: (await uploadDocument(file, masterId)).id };
        }
        fields.Document_Attachment = [uploaded.current.id];
      }
      await onSave({ id: String(fields.Event_UID), fields });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 rounded-lg border border-gray-700 bg-gray-900 p-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold">{initial ? "Edit event" : "Add an event"}</h3>
        <button type="button" onClick={onCancel} className="text-sm text-gray-300 hover:text-white">Cancel</button>
      </div>

      <label className="block text-sm">
        Event type
        <select className={inputClass} value={eventType} disabled={initial !== undefined} onChange={(event) => changeType(event.target.value)}>
          {Object.keys(eventTypeFields).map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}
        </select>
      </label>

      <label className="block text-sm">
        Event date
        <input type="date" required className={inputClass} value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
      </label>

      <label className="block text-sm">
        Source
        <select
          className={inputClass}
          value={source}
          onChange={(event) => setSource(event.target.value)}
        >
          {sourceField.options?.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>

      {fieldNames.map((name) => (
        <FieldInput
          key={`${eventType}-${name}`}
          field={eventFieldCatalog[name]}
          value={values[name]}
          onChange={(value) => setValues((previous) => ({ ...previous, [name]: value }))}
        />
      ))}

      <details className="rounded border border-gray-700 p-3">
        <summary className="cursor-pointer text-sm text-gray-300">Linked document (optional)</summary>
        <div className="mt-3 space-y-5">
          {initial?.documentAttachment?.map((id) => <DocumentLink key={String(id)} documentId={String(id)} />)}
          <label className="block text-sm">
            {initial?.documentAttachment?.length ? "Replace the attached file" : "Attach a file"} (PDF, PNG or JPEG, up to 25 MB)
            <input
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
          {linkableDocumentFields.map((name) => (
            <FieldInput
              key={name}
              field={eventFieldCatalog[name]}
              value={values[name]}
              onChange={(value) => setValues((previous) => ({ ...previous, [name]: value }))}
            />
          ))}
        </div>
      </details>

      <details className="rounded border border-gray-700 p-3">
        <summary className="cursor-pointer text-sm text-gray-300">Additional measurement (optional)</summary>
        <div className="mt-3 space-y-5">
          {measureFields.map((name) => (
            <FieldInput
              key={name}
              field={eventFieldCatalog[name]}
              value={values[name]}
              onChange={(value) => setValues((previous) => ({ ...previous, [name]: value }))}
            />
          ))}
        </div>
      </details>

      {candidateRule && (
        <details className="rounded border border-gray-700 p-3">
          <summary className="cursor-pointer text-sm text-gray-300">Related event (optional)</summary>
          <div className="mt-3 space-y-5">
            {candidates === undefined && <p className="text-sm text-gray-400">Looking for related events…</p>}
            {candidates === null && <p className="text-sm text-rose-300">Unable to load related events.</p>}
            {candidates && candidates.length === 0 && (
              <p className="text-sm text-gray-400">
                No {candidateRule.eventTypes.map(typeLabel).join(" or ")} events within {candidateRule.withinDays} days of this date.
              </p>
            )}
            {candidates && candidates.length > 0 && (
              <>
                <label className="block text-sm">
                  {candidateRule.eventTypes.map(typeLabel).join(" / ")} event this relates to
                  <select
                    className={inputClass}
                    value={candidates.some((candidate) => candidate.uid === values.Event_Related_UID) ? String(values.Event_Related_UID) : ""}
                    onChange={(event) => setValues((previous) => ({
                      ...previous,
                      Event_Related_UID: event.target.value,
                      Event_Relationship: previous.Event_Relationship || candidateRule.relationship,
                    }))}
                  >
                    <option value="">None</option>
                    {candidates.map((candidate) => (
                      <option key={candidate.uid} value={candidate.uid}>
                        {[typeLabel(candidate.eventType), candidate.eventDate?.slice(0, 10) ?? "no date", candidate.eventSummary]
                          .filter(Boolean)
                          .join(" · ")}
                      </option>
                    ))}
                  </select>
                </label>
                {candidates.some((candidate) => candidate.uid === values.Event_Related_UID) && (
                  <FieldInput
                    field={eventFieldCatalog.Event_Relationship}
                    value={values.Event_Relationship}
                    onChange={(value) => setValues((previous) => ({ ...previous, Event_Relationship: value }))}
                  />
                )}
              </>
            )}
          </div>
        </details>
      )}

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving…" : initial ? "Save changes" : "Save event"}
      </button>
      <p className="text-xs text-gray-400">
        {initial
          ? "Saving keeps the earlier version in this event's history; nothing is deleted."
          : "Choices come from the UnifiedEvents schema. The event is validated and stored for this patient."}
      </p>
    </form>
  );
}
