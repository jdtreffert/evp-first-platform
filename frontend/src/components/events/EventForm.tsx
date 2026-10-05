import { useState } from "react";
import type { FormEvent } from "react";
import type { RawEventRecord } from "../../../../backend/src/types/UnifiedEvents";
import { eventFieldCatalog } from "../../../../backend/src/schemas/eventFieldCatalog";
import type { FieldDefinition } from "../../../../backend/src/schemas/eventFieldCatalog";
import { documentFields, eventTypeFields, measureFields, relationshipFields } from "../../../../backend/src/schemas/eventTypeFields";

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
  onSave,
  onCancel,
}: {
  masterId: string;
  defaultSource: string;
  onSave: (event: RawEventRecord) => Promise<void>;
  onCancel: () => void;
}) {
  const [eventType, setEventType] = useState("Note");
  const [eventDate, setEventDate] = useState(getLocalDate);
  const [source, setSource] = useState(defaultSource);
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldNames = eventTypeFields[eventType];
  const sourceField = eventFieldCatalog.Event_Source;

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

    const fields: Record<string, unknown> = {
      Event_UID: `web-${crypto.randomUUID()}`,
      Event_Type: eventType,
      Event_Date: eventDate,
      Event_Source: source,
      Master_ID: masterId,
    };

    for (const name of [...fieldNames, ...linkableDocumentFields, ...relationshipFields, ...measureFields]) {
      const value = values[name];
      if (!isFilled(value)) continue;
      fields[name] = eventFieldCatalog[name].kind === "number" ? Number(value) : Array.isArray(value) ? value : value?.trim();
    }

    setSaving(true);
    try {
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
        <h3 className="text-xl font-semibold">Add an event</h3>
        <button type="button" onClick={onCancel} className="text-sm text-gray-300 hover:text-white">Cancel</button>
      </div>

      <label className="block text-sm">
        Event type
        <select className={inputClass} value={eventType} onChange={(event) => changeType(event.target.value)}>
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

      <details className="rounded border border-gray-700 p-3">
        <summary className="cursor-pointer text-sm text-gray-300">Related event (optional)</summary>
        <div className="mt-3 space-y-5">
          {relationshipFields.map((name) => (
            <FieldInput
              key={name}
              field={eventFieldCatalog[name]}
              value={values[name]}
              onChange={(value) => setValues((previous) => ({ ...previous, [name]: value }))}
            />
          ))}
        </div>
      </details>

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save event"}
      </button>
      <p className="text-xs text-gray-400">
        Choices come from the UnifiedEvents schema. The event is validated and stored for this patient.
      </p>
    </form>
  );
}
