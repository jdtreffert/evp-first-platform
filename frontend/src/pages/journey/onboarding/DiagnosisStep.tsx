import { useState, useEffect } from "react";

export default function DiagnosisStep({ diagnosis, setDiagnosis, onNext }) {
  // -----------------------------
  // Existing fields
  // -----------------------------
  const [diagnosisDate, setDiagnosisDate] = useState(diagnosis.diagnosisDate || "");
  const [histology, setHistology] = useState(diagnosis.histology || "");
  const [symptoms, setSymptoms] = useState(diagnosis.symptoms || "");
  const [initialImaging, setInitialImaging] = useState(diagnosis.initialImaging || []);
  const [initialCystoscopyNotes, setInitialCystoscopyNotes] = useState(
    diagnosis.initialCystoscopyNotes || ""
  );

  // -----------------------------
  // Clinical Stage + TNM
  // -----------------------------
  const [clinicalStage, setClinicalStage] = useState(diagnosis.clinicalStage || "");
  const [tStage, setTStage] = useState(diagnosis.tStage || "");
  const [nStage, setNStage] = useState(diagnosis.nStage || "");
  const [mStage, setMStage] = useState(diagnosis.mStage || "");

  // -----------------------------
  // Variant Histology
  // -----------------------------
  const [variantHistology, setVariantHistology] = useState(
    diagnosis.variantHistology || []
  );

  const variantHistologyOptions = [
    "Plasmacytoid",
    "Sarcomatoid",
    "Micropapillary",
    "Nested",
    "Glandular differentiation",
    "Squamous differentiation",
    "Small cell features",
    "Other"
  ];

  // -----------------------------
  // Clinical Stage Options
  // -----------------------------
  const clinicalStageOptions = [
    "Stage 0a",
    "Stage 0is",
    "Stage I",
    "Stage II",
    "Stage IIIA",
    "Stage IIIB",
    "Stage IVA",
    "Stage IVB",
    "Not sure"
  ];

  // -----------------------------
  // TNM Options
  // -----------------------------
  const tOptions = ["Ta", "T1", "T2", "T3", "T4a", "T4b"];
  const nOptions = ["N0", "N1", "N2", "N3"];
  const mOptions = ["M0", "M1"];

  // -----------------------------
  // Auto‑mapping TNM → Clinical Stage
  // -----------------------------
  const mapTNMToStage = (t, n, m) => {
    if (!t || !n || !m) return "";

    if (m === "M1") return "Stage IVB";
    if (t === "T4b") return "Stage IVA";
    if (t === "T4a" || n === "N2" || n === "N3") return "Stage IIIB";
    if (t === "T3" || n === "N1") return "Stage IIIA";
    if (t === "T2") return "Stage II";
    if (t === "T1") return "Stage I";
    if (t === "Ta") return "Stage 0a";

    return "";
  };

  useEffect(() => {
    const autoStage = mapTNMToStage(tStage, nStage, mStage);
    if (autoStage && clinicalStage !== autoStage) {
      setClinicalStage(autoStage);
    }
  }, [tStage, nStage, mStage]);

  // -----------------------------
  // Sync state when diagnosis changes
  // -----------------------------
  useEffect(() => {
    setDiagnosisDate(diagnosis.diagnosisDate || "");
    setHistology(diagnosis.histology || "");
    setSymptoms(diagnosis.symptoms || "");
    setInitialImaging(diagnosis.initialImaging || []);
    setInitialCystoscopyNotes(diagnosis.initialCystoscopyNotes || "");

    setClinicalStage(diagnosis.clinicalStage || "");
    setTStage(diagnosis.tStage || "");
    setNStage(diagnosis.nStage || "");
    setMStage(diagnosis.mStage || "");

    setVariantHistology(diagnosis.variantHistology || []);
  }, [diagnosis]);

  // -----------------------------
  // Save and continue
  // -----------------------------
  const handleNext = () => {
    setDiagnosis({
      ...diagnosis,
      diagnosisDate,
      clinicalStage,
      tStage,
      nStage,
      mStage,
      histology,
      variantHistology,
      symptoms,
      initialImaging,
      initialCystoscopyNotes
    });

    onNext();
  };

  const histologyOptions = [
    "Urothelial carcinoma",
    "Squamous",
    "Adenocarcinoma",
    "Small cell",
    "Other / Mixed"
  ];

  const imagingOptions = ["CT", "MRI", "PET/CT", "Ultrasound", "None / Not sure"];

  return (
    <div className="space-y-8 text-white">

      {/* Diagnosis Date */}
      <section>
        <h3 className="text-lg font-bold mb-2">Date of Diagnosis</h3>
        <input
          type="date"
          className="bg-gray-800 p-2 rounded"
          value={diagnosisDate}
          onChange={(e) => setDiagnosisDate(e.target.value)}
        />
      </section>

      {/* Clinical Stage */}
      <section>
        <h3 className="text-lg font-bold mb-2">Clinical Stage</h3>
        <select
          className="bg-gray-800 p-2 rounded"
          value={clinicalStage}
          onChange={(e) => setClinicalStage(e.target.value)}
        >
          <option value="">Select...</option>
          {clinicalStageOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </section>

      {/* TNM */}
      <section>
        <h3 className="text-lg font-bold mb-2">TNM Classification</h3>

        <div className="flex space-x-4">
          <div>
            <label className="block mb-1">T Stage</label>
            <select
              className="bg-gray-800 p-2 rounded"
              value={tStage}
              onChange={(e) => setTStage(e.target.value)}
            >
              <option value="">Select...</option>
              {tOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1">N Stage</label>
            <select
              className="bg-gray-800 p-2 rounded"
              value={nStage}
              onChange={(e) => setNStage(e.target.value)}
            >
              <option value="">Select...</option>
              {nOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1">M Stage</label>
            <select
              className="bg-gray-800 p-2 rounded"
              value={mStage}
              onChange={(e) => setMStage(e.target.value)}
            >
              <option value="">Select...</option>
              {mOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ⭐ TNM explanatory note */}
        <p className="text-sm text-gray-400 mt-2">
          If you enter T, N, and M values, your clinical stage will be updated
          automatically. You can still choose a stage manually if you already know it.
        </p>
      </section>

      {/* Primary Histology */}
      <section>
        <h3 className="text-lg font-bold mb-2">Primary Histology</h3>
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

      {/* Variant Histology */}
      <section>
        <h3 className="text-lg font-bold mb-2">Variant Histology (optional)</h3>
        {variantHistologyOptions.map((opt) => (
          <label key={opt} className="block">
            <input
              type="checkbox"
              checked={variantHistology.includes(opt)}
              onChange={() => {
                setVariantHistology((prev) =>
                  prev.includes(opt)
                    ? prev.filter((x) => x !== opt)
                    : [...prev, opt]
                );
              }}
            />
            <span className="ml-2">{opt}</span>
          </label>
        ))}
      </section>

      {/* Symptoms */}
      <section>
        <h3 className="text-lg font-bold mb-2">Initial Symptoms</h3>
        <textarea
          className="bg-gray-800 p-2 rounded w-full"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
        />
      </section>

      {/* Imaging */}
      <section>
        <h3 className="text-lg font-bold mb-2">Initial Diagnostic Tests</h3>
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

        {initialImaging.includes("None / Not sure") === false && (
          <div className="mt-4">
            <label className="block mb-2">Cystoscopy Findings (optional)</label>
            <textarea
              className="bg-gray-800 p-2 rounded w-full"
              value={initialCystoscopyNotes}
              onChange={(e) => setInitialCystoscopyNotes(e.target.value)}
            />
          </div>
        )}
      </section>

      <button
        onClick={handleNext}
        className="bg-blue-600 px-4 py-2 rounded"
      >
        Next
      </button>
    </div>
  );
}
