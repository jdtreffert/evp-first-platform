import { useState } from "react";
import type { FormEvent } from "react";
import type { RawEventRecord } from "../../../../backend/src/types/UnifiedEvents";

type EntryEventType = "Diagnosis" | "Imaging" | "Treatment_Start" | "ctDNA" | "Note" | "Other";

interface EventFormProps {
  masterId: string;
  eventSource: string;
  onSave: (event: RawEventRecord) => Promise<void>;
  onCancel: () => void;
}

interface EventFormValues {
  eventDate: string;
  histology: string;
  grade: string;
  diagnosisNotes: string;
  imagingModality: string;
  imagingResult: string;
  imagingRegion: string;
  imagingNotes: string;
  treatmentName: string;
  treatmentIntent: string;
  treatmentCycle: string;
  ctdnaVendor: string;
  ctdnaAssayType: string;
  ctdnaValue: string;
  ctdnaUnits: string;
  ctdnaTrend: string;
  noteText: string;
  otherDescription: string;
}

const eventTypes: { value: EntryEventType; label: string }[] = [
  { value: "Diagnosis", label: "Diagnosis" },
  { value: "Imaging", label: "Imaging" },
  { value: "Treatment_Start", label: "Treatment start" },
  { value: "ctDNA", label: "ctDNA result" },
  { value: "Note", label: "Clinical note" },
  { value: "Other", label: "Other event" },
];

const inputClass = "mt-1 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white";

function getLocalDate(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

export default function EventForm({ masterId, eventSource, onSave, onCancel }: EventFormProps) {
  const [eventType, setEventType] = useState<EntryEventType>("Note");
  const [values, setValues] = useState<EventFormValues>({
    eventDate: getLocalDate(),
    histology: "",
    grade: "",
    diagnosisNotes: "",
    imagingModality: "",
    imagingResult: "",
    imagingRegion: "",
    imagingNotes: "",
    treatmentName: "",
    treatmentIntent: "",
    treatmentCycle: "",
    ctdnaVendor: "",
    ctdnaAssayType: "",
    ctdnaValue: "",
    ctdnaUnits: "",
    ctdnaTrend: "",
    noteText: "",
    otherDescription: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateValue = (key: keyof EventFormValues, value: string) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const uid = `web-${crypto.randomUUID()}`;
    const fields: Record<string, unknown> = {
      Event_UID: uid,
      Event_Type: eventType,
      Event_Date: values.eventDate,
      Event_Source: eventSource,
      Master_ID: masterId,
    };

    switch (eventType) {
      case "Diagnosis":
        fields.Diagnosis_Histology = values.histology;
        fields.Diagnosis_Grade = values.grade;
        fields.Diagnosis_Notes = values.diagnosisNotes;
        break;
      case "Imaging":
        fields.Imaging_Modality = values.imagingModality;
        fields.Imaging_Result = values.imagingResult;
        fields.Imaging_Region = values.imagingRegion;
        fields.Imaging_Notes = values.imagingNotes;
        break;
      case "Treatment_Start":
        fields.Treatment_Name = values.treatmentName;
        fields.Treatment_Intent = values.treatmentIntent;
        if (values.treatmentCycle !== "") fields.Treatment_Cycle = Number(values.treatmentCycle);
        break;
      case "ctDNA":
        fields.ctDNA_Vendor = values.ctdnaVendor;
        fields.ctDNA_Assay_Type = values.ctdnaAssayType;
        if (values.ctdnaValue !== "") fields.ctDNA_Value = Number(values.ctdnaValue);
        fields.ctDNA_Units = values.ctdnaUnits;
        fields.ctDNA_Trend = values.ctdnaTrend;
        break;
      case "Note":
        fields.Note_Text = values.noteText;
        break;
      case "Other":
        fields.Other_Description = values.otherDescription;
        break;
    }

    setSaving(true);
    try {
      await onSave({ id: uid, fields });
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
        <select
          required
          className={inputClass}
          value={eventType}
          onChange={(event) => setEventType(event.target.value as EntryEventType)}
        >
          {eventTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>
      </label>

      <label className="block text-sm">
        Event date
        <input
          type="date"
          className={inputClass}
          value={values.eventDate}
          onChange={(event) => updateValue("eventDate", event.target.value)}
        />
      </label>

      {eventType === "Diagnosis" && (
        <>
          <label className="block text-sm">Histology<input required className={inputClass} value={values.histology} onChange={(event) => updateValue("histology", event.target.value)} /></label>
          <label className="block text-sm">Grade<input className={inputClass} value={values.grade} onChange={(event) => updateValue("grade", event.target.value)} /></label>
          <label className="block text-sm">Notes<textarea className={inputClass} rows={3} value={values.diagnosisNotes} onChange={(event) => updateValue("diagnosisNotes", event.target.value)} /></label>
        </>
      )}

      {eventType === "Imaging" && (
        <>
          <label className="block text-sm">Modality<input required className={inputClass} placeholder="CT, MRI, PET/CT…" value={values.imagingModality} onChange={(event) => updateValue("imagingModality", event.target.value)} /></label>
          <label className="block text-sm">Result<input required className={inputClass} value={values.imagingResult} onChange={(event) => updateValue("imagingResult", event.target.value)} /></label>
          <label className="block text-sm">Region<input className={inputClass} value={values.imagingRegion} onChange={(event) => updateValue("imagingRegion", event.target.value)} /></label>
          <label className="block text-sm">Notes<textarea className={inputClass} rows={3} value={values.imagingNotes} onChange={(event) => updateValue("imagingNotes", event.target.value)} /></label>
        </>
      )}

      {eventType === "Treatment_Start" && (
        <>
          <label className="block text-sm">Treatment or regimen<input required className={inputClass} value={values.treatmentName} onChange={(event) => updateValue("treatmentName", event.target.value)} /></label>
          <label className="block text-sm">Intent<input className={inputClass} value={values.treatmentIntent} onChange={(event) => updateValue("treatmentIntent", event.target.value)} /></label>
          <label className="block text-sm">Cycle<input type="number" min="0" step="1" className={inputClass} value={values.treatmentCycle} onChange={(event) => updateValue("treatmentCycle", event.target.value)} /></label>
        </>
      )}

      {eventType === "ctDNA" && (
        <>
          <label className="block text-sm">Vendor<input className={inputClass} value={values.ctdnaVendor} onChange={(event) => updateValue("ctdnaVendor", event.target.value)} /></label>
          <label className="block text-sm">Assay type<input className={inputClass} value={values.ctdnaAssayType} onChange={(event) => updateValue("ctdnaAssayType", event.target.value)} /></label>
          <label className="block text-sm">Value<input type="number" step="any" className={inputClass} value={values.ctdnaValue} onChange={(event) => updateValue("ctdnaValue", event.target.value)} /></label>
          <label className="block text-sm">Units<input className={inputClass} value={values.ctdnaUnits} onChange={(event) => updateValue("ctdnaUnits", event.target.value)} /></label>
          <label className="block text-sm">Trend<input className={inputClass} placeholder="Increasing, decreasing, stable…" value={values.ctdnaTrend} onChange={(event) => updateValue("ctdnaTrend", event.target.value)} /></label>
        </>
      )}

      {eventType === "Note" && (
        <label className="block text-sm">Note<textarea required className={inputClass} rows={5} value={values.noteText} onChange={(event) => updateValue("noteText", event.target.value)} /></label>
      )}

      {eventType === "Other" && (
        <label className="block text-sm">Description<textarea required className={inputClass} rows={4} value={values.otherDescription} onChange={(event) => updateValue("otherDescription", event.target.value)} /></label>
      )}

      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save event"}
      </button>
      <p className="text-xs text-gray-400">Supported event types: diagnosis, imaging, treatment start, ctDNA result, note, and other.</p>
    </form>
  );
}
