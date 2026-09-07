import { useState } from "react";

export default function EventForm({ onSave, onCancel }) {
  // Core fields
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");

  // Imaging fields
  const [modality, setModality] = useState("");
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");

  // Cystoscopy fields
  const [visualFindings, setVisualFindings] = useState("");
  const [biopsyResults, setBiopsyResults] = useState("");

  // TURBT fields
  const [depth, setDepth] = useState("");
  const [margins, setMargins] = useState("");
  const [lvi, setLvi] = useState("");
  const [variantHistology, setVariantHistology] = useState("");
  const [surgeonNotes, setSurgeonNotes] = useState("");

  // ctDNA fields
  const [ctdnaVendor, setCtdnaVendor] = useState("");
  const [assayType, setAssayType] = useState("");
  const [ctdnaResult, setCtdnaResult] = useState("");
  const [ctdnaValue, setCtdnaValue] = useState("");
  const [ctdnaTrend, setCtdnaTrend] = useState("");

  // Treatment Change fields
  const [changeType, setChangeType] = useState("");
  const [changeReason, setChangeReason] = useState("");

  const eventTypes = [
    "Diagnosis",
    "Imaging",
    "Cystoscopy",
    "Pathology",
    "TURBT",
    "Treatment Start",
    "Treatment Change",
    "Treatment Pathway Change",
    "Surveillance Visit",
    "Labwork",
    "Cytology",
    "ctDNA",
    "Best Response",
    "Recurrence",
    "Progression",
    "Major Event"
  ];

  const imagingModalities = ["CT", "MRI", "PET/CT", "Ultrasound"];

  const ctdnaVendors = [
    "Natera (Signatera)",
    "Tempus",
    "Guardant Reveal",
    "Foundation",
    "Other"
  ];

  const assayTypes = [
    "Tumor-informed",
    "Tissue-free / tumor-naïve"
  ];

  const ctdnaResults = ["Negative", "Positive", "Indeterminate"];

  const changeTypes = [
    "Dose reduction",
    "Pause",
    "Switch",
    "Stop treatment",
    "Other"
  ];

  const handleSubmit = () => {
    const event = {
      eventType,
      eventDate,
      title,
      summary,
      details,

      // Imaging
      modality,
      findings,
      impression,

      // Cystoscopy
      visualFindings,
      biopsyResults,

      // TURBT
      depth,
      margins,
      lvi,
      variantHistology,
      surgeonNotes,

      // ctDNA
      ctdnaVendor,
      assayType,
      ctdnaResult,
      ctdnaValue,
      ctdnaTrend,

      // Treatment Change
      changeType,
      changeReason
    };

    onSave(event);
  };

  return (
    <div className="bg-gray-900 p-6 rounded text-white space-y-6">

      <h3 className="text-xl font-bold">Add Event</h3>

      {/* Event Type */}
      <section>
        <label className="block mb-2">Event Type</label>
        <select
          className="bg-gray-800 p-2 rounded w-full"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
        >
          <option value="">Select...</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </section>

      {/* Event Date */}
      <section>
        <label className="block mb-2">Event Date</label>
        <input
          type="date"
          className="bg-gray-800 p-2 rounded w-full"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
        />
      </section>

      {/* Title */}
      <section>
        <label className="block mb-2">Title</label>
        <input
          type="text"
          className="bg-gray-800 p-2 rounded w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short title for this event"
        />
      </section>

      {/* Summary */}
      <section>
        <label className="block mb-2">Summary</label>
        <textarea
          className="bg-gray-800 p-2 rounded w-full"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Brief summary of what happened"
        />
      </section>

      {/* Dynamic Fields */}

      {/* Imaging */}
      {eventType === "Imaging" && (
        <section className="space-y-4">
          <h4 className="font-bold">Imaging Details</h4>

          <label className="block">Modality</label>
          <select
            className="bg-gray-800 p-2 rounded w-full"
            value={modality}
            onChange={(e) => setModality(e.target.value)}
          >
            <option value="">Select...</option>
            {imagingModalities.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <label className="block">Findings</label>
          <textarea
            className="bg-gray-800 p-2 rounded w-full"
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
          />

          <label className="block">Impression</label>
          <textarea
            className="bg-gray-800 p-2 rounded w-full"
            value={impression}
            onChange={(e) => setImpression(e.target.value)}
          />
        </section>
      )}

      {/* Cystoscopy */}
      {eventType === "Cystoscopy" && (
        <section className="space-y-4">
          <h4 className="font-bold">Cystoscopy Details</h4>

          <label className="block">Visual Findings</label>
          <textarea
            className="bg-gray-800 p-2 rounded w-full"
            value={visualFindings}
            onChange={(e) => setVisualFindings(e.target.value)}
          />

          <label className="block">Biopsy Results</label>
          <textarea
            className="bg-gray-800 p-2 rounded w-full"
            value={biopsyResults}
            onChange={(e) => setBiopsyResults(e.target.value)}
          />
        </section>
      )}

      {/* TURBT */}
      {eventType === "TURBT" && (
        <section className="space-y-4">
          <h4 className="font-bold">TURBT Details</h4>

          <label className="block">Depth (T-stage)</label>
          <select
            className="bg-gray-800 p-2 rounded w-full"
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
          >
            <option value="">Select...</option>
            <option value="Ta">Ta</option>
            <option value="T1">T1</option>
            <option value="T2">T2</option>
            <option value="T3">T3</option>
            <option value="T4">T4</option>
          </select>

          <label className="block">Margins</label>
          <select
            className="bg-gray-800 p-2 rounded w-full"
            value={margins}
            onChange={(e) => setMargins(e.target.value)}
          >
            <option value="">Select...</option>
            <option value="Negative">Negative</option>
            <option value="Positive">Positive</option>
          </select>

          <label className="block">Lymphovascular Invasion (LVI)</label>
          <select
            className="bg-gray-800 p-2 rounded w-full"
            value={lvi}
            onChange={(e) => setLvi(e.target.value)}
          >
            <option value="">Select...</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
          </select>

          <label className="block">Variant Histology</label>
          <input
            type="text"
            className="bg-gray-800 p-2 rounded w-full"
            value={variantHistology}
            onChange={(e) => setVariantHistology(e.target.value)}
            placeholder="e.g., plasmacytoid, micropapillary"
          />

          <label className="block">Surgeon Notes</label>
          <textarea
            className="bg-gray-800 p-2 rounded w-full"
            value={surgeonNotes}
            onChange={(e) => setSurgeonNotes(e.target.value)}
          />
        </section>
      )}

      {/* ctDNA */}
      {eventType === "ctDNA" && (
        <section className="space-y-4">
          <h4 className="font-bold">ctDNA Details</h4>

          <label className="block">Vendor</label>
          <select
            className="bg-gray-800 p-2 rounded w-full"
            value={ctdnaVendor}
            onChange={(e) => setCtdnaVendor(e.target.value)}
          >
            <option value="">Select...</option>
            {ctdnaVendors.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          <label className="block">Assay Type</label>
          <select
            className="bg-gray-800 p-2 rounded w-full"
            value={assayType}
            onChange={(e) => setAssayType(e.target.value)}
          >
            <option value="">Select...</option>
            {assayTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <label className="block">Result</label>
          <select
            className="bg-gray-800 p-2 rounded w-full"
            value={ctdnaResult}
            onChange={(e) => setCtdnaResult(e.target.value)}
          >
            <option value="">Select...</option>
            {ctdnaResults.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <label className="block">Value (if provided)</label>
          <input
            type="text"
            className="bg-gray-800 p-2 rounded w-full"
            value={ctdnaValue}
            onChange={(e) => setCtdnaValue(e.target.value)}
            placeholder="e.g., 0.00 MTM/mL"
          />

          <label className="block">Trend</label>
          <select
            className="bg-gray-800 p-2 rounded w-full"
            value={ctdnaTrend}
            onChange={(e) => setCtdnaTrend(e.target.value)}
          >
            <option value="">Select...</option>
            <option value="Rising">Rising</option>
            <option value="Falling">Falling</option>
            <option value="Stable">Stable</option>
          </select>
        </section>
      )}

      {/* Treatment Change */}
      {eventType === "Treatment Change" && (
        <section className="space-y-4">
          <h4 className="font-bold">Treatment Change Details</h4>

          <label className="block">Change Type</label>
          <select
            className="bg-gray-800 p-2 rounded w-full"
            value={changeType}
            onChange={(e) => setChangeType(e.target.value)}
          >
            <option value="">Select...</option>
            {changeTypes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="block">Reason</label>
          <textarea
            className="bg-gray-800 p-2 rounded w-full"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
          />
        </section>
      )}

      {/* Additional Details */}
      <section>
        <label className="block mb-2">Additional Details (optional)</label>
        <textarea
          className="bg-gray-800 p-2 rounded w-full"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
      </section>

      {/* Buttons */}
      <div className="flex space-x-4">
        <button
          className="bg-blue-600 px-4 py-2 rounded font-bold"
          onClick={handleSubmit}
        >
          Save Event
        </button>

        <button
          className="bg-gray-700 px-4 py-2 rounded"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
