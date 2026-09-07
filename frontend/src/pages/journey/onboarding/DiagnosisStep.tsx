import { useState } from "react";

export default function DiagnosisStep() {
  const [diagnosisDate, setDiagnosisDate] = useState("");
  const [stage, setStage] = useState("");
  const [histology, setHistology] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [initialImaging, setInitialImaging] = useState<string[]>([]);
  const [initialCystoscopyNotes, setInitialCystoscopyNotes] = useState("");

  const imagingOptions = [
    "CT",
    "MRI",
    "PET/CT",
    "Ultrasound",
    "None / Not sure"
  ];

  const stageOptions = [
    "Ta",
    "T1",
    "T2",
    "T3",
    "T4",
    "Not sure"
  ];

  const histologyOptions = [
    "Urothelial carcinoma",
    "Squamous",
    "Adenocarcinoma",
    "Small cell",
    "Variant histology",
    "Not sure"
  ];

  return (
    <div className="space-y-8 text-white">

      {/* Date of Diagnosis */}
      <section>
        <h3 className="text-lg font-bold mb-2">Date of Diagnosis</h3>
        <input
          type="date"
          className="bg-gray-800 p-2 rounded"
          value={diagnosisDate}
          onChange={(e) => setDiagnosisDate(e.target.value)}
        />
      </section>

      {/* Stage at Diagnosis */}
      <section>
        <h3 className="text-lg font-bold mb-2">Stage at Diagnosis</h3>
        <select
          className="bg-gray-800 p-2 rounded"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        >
          <option value="">Select...</option>
          {stageOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </section>

      {/* Histology */}
      <section>
        <h3 className="text-lg font-bold mb-2">Histology</h3>
        <select
          className="bg-gray-800 p-2 rounded"
          value={histology}
          onChange={(e) => setHistology(e.target.value)}
        >
          <option value="">Select...</option>
          {histologyOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </section>

      {/* Initial Symptoms */}
      <section>
        <h3 className="text-lg font-bold mb-2">Initial Symptoms</h3>
        <textarea
          className="bg-gray-800 p-2 rounded w-full"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="Describe any symptoms you experienced before diagnosis..."
        />
      </section>

      {/* Initial Imaging */}
      <section>
        <h3 className="text-lg font-bold mb-2">Initial Diagnostic Tests</h3>
        <p className="text-sm mb-4">
          Select any tests performed at or before diagnosis.
        </p>

        {imagingOptions.map((opt) => (
          <label key={opt} className="block">
            <input
              type="checkbox"
              checked={initialImaging.includes(opt)}
              onChange={() => {
                setInitialImaging((prev) =>
                  prev.includes(opt)
                    ? prev.filter((x) => x !== opt)
                    : [...prev, opt]
                );
              }}
            />
            <span className="ml-2">{opt}</span>
          </label>
        ))}

        {/* Conditional cystoscopy notes */}
        {initialImaging.includes("None / Not sure") === false && (
          <div className="mt-4">
            <label className="block mb-2">Cystoscopy Findings (optional)</label>
            <textarea
              className="bg-gray-800 p-2 rounded w-full"
              value={initialCystoscopyNotes}
              onChange={(e) => setInitialCystoscopyNotes(e.target.value)}
              placeholder="Describe any findings from cystoscopy..."
            />
          </div>
        )}
      </section>
    </div>
  );
}
