import { useState } from "react";
import type { FormEvent } from "react";
import type { RawEventRecord } from "../../../../backend/src/types/UnifiedEvents";

type FieldKind = "text" | "number" | "multiline" | "list";

interface EventField {
  key: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
  placeholder?: string;
}

interface EventTypeDefinition {
  label: string;
  fields: EventField[];
  subtypes?: Record<string, { label: string; fields: EventField[] }>;
}

const eventTypes: Record<string, EventTypeDefinition> = {
  Diagnosis: {
    label: "Diagnosis",
    fields: [
      { key: "Diagnosis_Histology", label: "Histology", required: true },
      { key: "Diagnosis_Grade", label: "Grade" },
      { key: "Diagnosis_Variant_Histology", label: "Variant histology", kind: "list", placeholder: "Separate items with commas" },
      { key: "Diagnosis_Depth", label: "Depth" },
      { key: "Diagnosis_Margins", label: "Margins" },
      { key: "Diagnosis_LVI", label: "Lymphovascular invasion (LVI)" },
      { key: "Diagnosis_Notes", label: "Notes", kind: "multiline" },
    ],
  },
  TURBT: {
    label: "TURBT",
    fields: [
      { key: "Pathology_Histology", label: "Histology", required: true },
      { key: "Pathology_Grade", label: "Grade" },
      { key: "Pathology_Variant_Histology", label: "Variant histology", kind: "list" },
      { key: "Pathology_Depth", label: "Depth" },
      { key: "Pathology_Margins", label: "Margins" },
      { key: "Pathology_LVI", label: "Lymphovascular invasion (LVI)" },
      { key: "Pathology_Notes", label: "Notes", kind: "multiline" },
    ],
  },
  Pathology: {
    label: "Pathology",
    fields: [
      { key: "Pathology_Histology", label: "Histology", required: true },
      { key: "Pathology_Grade", label: "Grade" },
      { key: "Pathology_Variant_Histology", label: "Variant histology", kind: "list" },
      { key: "Pathology_Depth", label: "Depth" },
      { key: "Pathology_Margins", label: "Margins" },
      { key: "Pathology_LVI", label: "Lymphovascular invasion (LVI)" },
      { key: "Pathology_Notes", label: "Notes", kind: "multiline" },
    ],
  },
  Cytology: {
    label: "Cytology",
    fields: [
      { key: "Cytology_Result", label: "Result", required: true },
      { key: "Cytology_Category", label: "Category" },
      { key: "Cytology_Specimen", label: "Specimen" },
      { key: "Cytology_Notes", label: "Notes", kind: "multiline" },
    ],
  },
  Imaging: {
    label: "Imaging",
    fields: [
      { key: "Imaging_Modality", label: "Modality", required: true, placeholder: "CT, MRI, PET/CT…" },
      { key: "Imaging_Result", label: "Result", required: true },
      { key: "Imaging_Region", label: "Region" },
      { key: "Imaging_Comparison_To_Prior", label: "Comparison to prior" },
      { key: "Imaging_Notes", label: "Notes", kind: "multiline" },
    ],
  },
  Imaging_Response: {
    label: "Imaging response",
    fields: [
      { key: "Imaging_Response_Category", label: "Response category", required: true },
      { key: "Imaging_Response_Criteria", label: "Criteria" },
      { key: "Imaging_Response_Target_Lesion_Change", label: "Target lesion change (%)", kind: "number" },
    ],
  },
  Cystoscopy: {
    label: "Cystoscopy",
    fields: [
      { key: "Cystoscopy_Findings", label: "Findings", required: true, kind: "multiline" },
      { key: "Cystoscopy_Visibility", label: "Visibility" },
      { key: "Cystoscopy_Reason", label: "Reason" },
      { key: "Cystoscopy_Notes", label: "Notes", kind: "multiline" },
    ],
  },
  Cystoscopy_Biopsy: {
    label: "Cystoscopy biopsy",
    fields: [
      { key: "Biopsy_Result", label: "Result", required: true },
      { key: "Biopsy_Site", label: "Site" },
      { key: "Biopsy_Notes", label: "Notes", kind: "multiline" },
    ],
  },
  Somatic: {
    label: "Somatic testing",
    fields: [
      { key: "Somatic_Vendor", label: "Vendor" },
      { key: "Somatic_Test_Type", label: "Test type" },
      { key: "Somatic_Key_Findings", label: "Key findings", kind: "list", required: true },
      { key: "Somatic_PDL1_CPS", label: "PD-L1 CPS", kind: "number" },
      { key: "Somatic_ERBB2_Expression", label: "ERBB2 expression" },
      { key: "Somatic_Notes", label: "Notes", kind: "multiline" },
    ],
  },
  Germline: {
    label: "Germline testing",
    fields: [
      { key: "Germline_Vendor", label: "Vendor" },
      { key: "Germline_Findings", label: "Findings", kind: "list", required: true },
      { key: "Germline_Pathogenicity", label: "Pathogenicity" },
      { key: "Germline_Notes", label: "Notes", kind: "multiline" },
    ],
  },
  ctDNA: {
    label: "ctDNA",
    fields: [
      { key: "ctDNA_Vendor", label: "Vendor" },
      { key: "ctDNA_Assay_Type", label: "Assay type" },
      { key: "ctDNA_Value", label: "Value", kind: "number" },
      { key: "ctDNA_Units", label: "Units" },
      { key: "ctDNA_Trend", label: "Trend", required: true },
    ],
  },
  utDNA: {
    label: "utDNA",
    fields: [
      { key: "utDNA_Vendor", label: "Vendor" },
      { key: "utDNA_Assay_Type", label: "Assay type" },
      { key: "utDNA_Value", label: "Value", kind: "number" },
      { key: "utDNA_Units", label: "Units" },
      { key: "utDNA_Trend", label: "Trend", required: true },
      { key: "utDNA_Notes", label: "Notes", kind: "multiline" },
    ],
  },
  Treatment_Start: {
    label: "Treatment start",
    fields: [
      { key: "Treatment_Name", label: "Treatment or regimen", required: true },
      { key: "Treatment_Cycle", label: "Cycle", kind: "number" },
      { key: "Treatment_Intent", label: "Intent" },
    ],
  },
  Treatment_Change: {
    label: "Treatment change",
    fields: [
      { key: "Treatment_Change_Type", label: "Change type", required: true },
      { key: "Treatment_Change_Reason", label: "Reason" },
      { key: "Treatment_Change_New_Regimen", label: "New regimen" },
      { key: "Treatment_Change_Toxicity_Grade", label: "Toxicity grade", kind: "number" },
    ],
  },
  Treatment_Response: {
    label: "Treatment response",
    fields: [
      { key: "Treatment_Response_Category", label: "Response category", required: true },
      { key: "Treatment_Response_Modality", label: "Modality" },
      { key: "Treatment_Response_Notes", label: "Notes", kind: "multiline" },
    ],
  },
  Treatment_Outcome: {
    label: "Treatment outcome",
    fields: [{ key: "Treatment_Outcome", label: "Outcome", required: true }],
  },
  Treatment_Regimen_Details: {
    label: "Treatment regimen details",
    fields: [{ key: "Treatment_Regimen_Details", label: "Regimen details", kind: "multiline", required: true }],
  },
  Treatment: {
    label: "Treatment (select subtype)",
    fields: [],
    subtypes: {
      start: {
        label: "Treatment start",
        fields: [
          { key: "Treatment_Start_Reason", label: "Start reason", required: true },
          { key: "Treatment_Name", label: "Treatment or regimen" },
          { key: "Treatment_Cycle", label: "Cycle", kind: "number" },
          { key: "Treatment_Intent", label: "Intent" },
        ],
      },
      change: {
        label: "Treatment change",
        fields: [
          { key: "Treatment_Change_Reason", label: "Change reason", required: true },
          { key: "Treatment_Change_Type", label: "Change type" },
          { key: "Treatment_Change_New_Regimen", label: "New regimen" },
          { key: "Treatment_Change_Toxicity_Grade", label: "Toxicity grade", kind: "number" },
        ],
      },
      response: {
        label: "Treatment response",
        fields: [
          { key: "Treatment_Response_Category", label: "Response category", required: true },
          { key: "Treatment_Response_Modality", label: "Modality" },
          { key: "Treatment_Response_Notes", label: "Notes", kind: "multiline" },
        ],
      },
      outcome: {
        label: "Treatment outcome",
        fields: [{ key: "Treatment_Outcome", label: "Outcome", required: true }],
      },
      regimen: {
        label: "Regimen details",
        fields: [
          { key: "Treatment_Regimen_Name", label: "Regimen name", required: true },
          { key: "Treatment_Regimen_Type", label: "Regimen type" },
          { key: "Treatment_Regimen_Details", label: "Regimen details", kind: "multiline", required: true },
        ],
      },
    },
  },
  Recurrence: {
    label: "Recurrence",
    fields: [
      { key: "Recurrence_Location", label: "Location", required: true },
      { key: "Recurrence_Spread_Category", label: "Spread category" },
      { key: "Recurrence_Modality", label: "Modality" },
      { key: "Recurrence_Confirmation", label: "Confirmation" },
      { key: "Recurrence_Notes", label: "Notes", kind: "multiline" },
    ],
  },
  Progression: {
    label: "Progression",
    fields: [
      { key: "Progression_Location", label: "Location", required: true },
      { key: "Progression_Stage_Spread", label: "Stage spread" },
      { key: "Progression_Modality", label: "Modality" },
      { key: "Progression_Stage_Change", label: "Stage change" },
      { key: "Progression_Notes", label: "Notes", kind: "multiline" },
    ],
  },
  QoL: {
    label: "Quality of life",
    fields: [
      { key: "QoL_Physical", label: "Physical score", kind: "number" },
      { key: "QoL_Emotional", label: "Emotional score", kind: "number" },
      { key: "QoL_Urinary", label: "Urinary score", kind: "number" },
      { key: "QoL_Pain", label: "Pain score", kind: "number" },
      { key: "QoL_Fatigue", label: "Fatigue score", kind: "number" },
      { key: "QoL_Notes", label: "Notes", kind: "multiline" },
    ],
  },
  Symptom: {
    label: "Symptom",
    fields: [
      { key: "Symptom_Description", label: "Description", required: true },
      { key: "Symptom_Type", label: "Type" },
      { key: "Symptom_Severity", label: "Severity", kind: "number" },
      { key: "Symptom_Duration", label: "Duration", kind: "number" },
      { key: "Symptom_Duration_Units", label: "Duration units" },
    ],
  },
  Labs: {
    label: "Lab work",
    fields: [
      { key: "Lab_Flags", label: "Flags", kind: "list" },
      { key: "Lab_Values", label: "Values (one “name: value” per line)", kind: "multiline", placeholder: "Creatinine: 1.1\nHemoglobin: 13.2" },
      { key: "Lab_Significance_Reasons", label: "Significance reasons", kind: "list" },
      { key: "Lab_Notes", label: "Notes", kind: "multiline" },
    ],
  },
  Decision: {
    label: "Care decision",
    fields: [
      { key: "Decision_Type", label: "Decision type", required: true },
      { key: "Decision_Consensus", label: "Consensus" },
      { key: "Decision_Notes", label: "Notes", kind: "multiline" },
    ],
  },
  Note: {
    label: "Note",
    fields: [{ key: "Note_Text", label: "Note", kind: "multiline", required: true }],
  },
  Other: {
    label: "Other event",
    fields: [{ key: "Other_Description", label: "Description", kind: "multiline", required: true }],
  },
  Document: {
    label: "Document",
    fields: [
      { key: "Document_Type", label: "Document type", required: true },
      { key: "Document_Redaction_Status", label: "Redaction status" },
    ],
  },
  Event_Measure: {
    label: "Event measure",
    fields: [
      { key: "Event_Measure_Type", label: "Measure type", required: true },
      { key: "Event_Measure_Value", label: "Value" },
      { key: "Event_Measure_Units", label: "Units" },
    ],
  },
};

const inputClass = "mt-1 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white";

function getLocalDate(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function parseValue(field: EventField, value: string): unknown {
  if (field.kind === "number") return Number(value);
  if (field.kind === "list") return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
  return value.trim();
}

export default function EventForm({
  masterId,
  eventSource,
  onSave,
  onCancel,
}: {
  masterId: string;
  eventSource: string;
  onSave: (event: RawEventRecord) => Promise<void>;
  onCancel: () => void;
}) {
  const [eventType, setEventType] = useState("Note");
  const [treatmentSubtype, setTreatmentSubtype] = useState("start");
  const [eventDate, setEventDate] = useState(getLocalDate);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const definition = eventTypes[eventType];
  const activeSubtype = definition.subtypes?.[treatmentSubtype];
  const fieldsToRender = activeSubtype?.fields ?? definition.fields;

  const updateValue = (key: string, value: string) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const missingField = fieldsToRender.find((field) => {
      if (!field.required) return false;
      const value = values[field.key]?.trim() ?? "";
      const parsedValue = parseValue(field, value);
      return value === "" || (field.kind === "list" && Array.isArray(parsedValue) && parsedValue.length === 0);
    });
    const hasEventDetail = fieldsToRender.some((field) => {
      const value = values[field.key]?.trim() ?? "";
      if (value === "") return false;
      const parsedValue = parseValue(field, value);
      return !Array.isArray(parsedValue) || parsedValue.length > 0;
    });
    if (missingField) {
      setError(`${missingField.label} is required.`);
      return;
    }
    if (!hasEventDetail) {
      setError("Enter at least one event detail before saving.");
      return;
    }

    const fields: Record<string, unknown> = {
      Event_UID: `web-${crypto.randomUUID()}`,
      Event_Type: eventType,
      Event_Date: eventDate,
      Event_Source: eventSource,
      Master_ID: masterId,
    };

    for (const field of fieldsToRender) {
      const value = values[field.key] ?? "";
      if (value.trim() !== "") fields[field.key] = parseValue(field, value);
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
        <select required className={inputClass} value={eventType} onChange={(event) => setEventType(event.target.value)}>
          {Object.entries(eventTypes).map(([type, option]) => <option key={type} value={type}>{option.label}</option>)}
        </select>
      </label>

      <label className="block text-sm">
        Event date
        <input type="date" className={inputClass} value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
      </label>

      {definition.subtypes && (
        <label className="block text-sm">
          Treatment event
          <select
            className={inputClass}
            value={treatmentSubtype}
            onChange={(event) => setTreatmentSubtype(event.target.value)}
          >
            {Object.entries(definition.subtypes).map(([subtype, option]) => (
              <option key={subtype} value={subtype}>{option.label}</option>
            ))}
          </select>
        </label>
      )}

      {fieldsToRender.map((field) => (
        <label key={field.key} className="block text-sm">
          {field.label}
          {field.kind === "multiline" || field.kind === "list" ? (
            <textarea
              required={field.required}
              className={inputClass}
              rows={field.kind === "multiline" ? 4 : 2}
              placeholder={field.placeholder}
              value={values[field.key] ?? ""}
              onChange={(event) => updateValue(field.key, event.target.value)}
            />
          ) : (
            <input
              required={field.required}
              type={field.kind === "number" ? "number" : "text"}
              step={field.kind === "number" ? "any" : undefined}
              className={inputClass}
              placeholder={field.placeholder}
              value={values[field.key] ?? ""}
              onChange={(event) => updateValue(field.key, event.target.value)}
            />
          )}
        </label>
      ))}

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save event"}
      </button>
      <p className="text-xs text-gray-400">
        Values are submitted to the registered normalizer, validated as a UnifiedEvent, and stored for this patient.
      </p>
    </form>
  );
}
