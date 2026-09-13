import React from "react";

export default function DiagnosticSummaryStep({
  diagnosis,
  treatment,
  response,
  qol,
  onEditSection,
  onComplete
}) {
  return (
    <div className="space-y-10 text-white">

      <h2 className="text-xl font-bold mb-4">Summary</h2>

      {/* ---------------- Diagnosis Summary ---------------- */}
      <section className="bg-gray-800 p-4 rounded">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">Diagnosis</h3>
          <button
            className="text-blue-400 underline"
            onClick={() => onEditSection("diagnosis")}
          >
            Edit
          </button>
        </div>

        <p><strong>Date of Diagnosis:</strong> {diagnosis.diagnosisDate || "Not provided"}</p>

        <p><strong>Clinical Stage:</strong> {diagnosis.clinicalStage || "Not provided"}</p>

        <p><strong>T Stage:</strong> {diagnosis.tStage || "Not provided"}</p>
        <p><strong>N Stage:</strong> {diagnosis.nStage || "Not provided"}</p>
        <p><strong>M Stage:</strong> {diagnosis.mStage || "Not provided"}</p>

        <p><strong>Histology:</strong> {diagnosis.histology || "Not provided"}</p>

        <p><strong>Variant Histology:</strong> 
          {diagnosis.variantHistology?.length
            ? diagnosis.variantHistology.join(", ")
            : "None reported"}
        </p>

        <p><strong>Symptoms:</strong> {diagnosis.symptoms || "Not provided"}</p>

        <p><strong>Initial Imaging:</strong> 
          {diagnosis.initialImaging?.length
            ? diagnosis.initialImaging.join(", ")
            : "Not provided"}
        </p>

        <p><strong>Cystoscopy Notes:</strong> 
          {diagnosis.initialCystoscopyNotes || "Not provided"}
        </p>
      </section>

      {/* ---------------- Treatment Summary ---------------- */}
      <section className="bg-gray-800 p-4 rounded">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">Treatment</h3>
          <button
            className="text-blue-400 underline"
            onClick={() => onEditSection("treatment")}
          >
            Edit
          </button>
        </div>

        <p><strong>TURBT Date:</strong> {treatment.turbtDate || "Not provided"}</p>
        <p><strong>TURBT Notes:</strong> {treatment.turbtNotes || "Not provided"}</p>

        <p><strong>BCG Start:</strong> {treatment.bcgStart || "Not provided"}</p>
        <p><strong>BCG End:</strong> {treatment.bcgEnd || "Not provided"}</p>
        <p><strong>BCG Notes:</strong> {treatment.bcgNotes || "Not provided"}</p>

        <p><strong>Chemo Regimen:</strong> {treatment.chemoRegimen || "Not provided"}</p>
        <p><strong>Chemo Start:</strong> {treatment.chemoStart || "Not provided"}</p>
        <p><strong>Chemo End:</strong> {treatment.chemoEnd || "Not provided"}</p>
        <p><strong>Chemo Notes:</strong> {treatment.chemoNotes || "Not provided"}</p>

        <p><strong>Immunotherapy Agent:</strong> {treatment.ioAgent || "Not provided"}</p>
        <p><strong>IO Start:</strong> {treatment.ioStart || "Not provided"}</p>
        <p><strong>IO End:</strong> {treatment.ioEnd || "Not provided"}</p>
        <p><strong>IO Notes:</strong> {treatment.ioNotes || "Not provided"}</p>

        <p><strong>Radiation Start:</strong> {treatment.radiationStart || "Not provided"}</p>
        <p><strong>Radiation End:</strong> {treatment.radiationEnd || "Not provided"}</p>
        <p><strong>Radiation Notes:</strong> {treatment.radiationNotes || "Not provided"}</p>

        <p><strong>Radical Cystectomy Date:</strong> {treatment.rcDate || "Not provided"}</p>
        <p><strong>RC Notes:</strong> {treatment.rcNotes || "Not provided"}</p>
      </section>

      {/* ---------------- Response Summary ---------------- */}
      <section className="bg-gray-800 p-4 rounded">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">Treatment Response</h3>
          <button
            className="text-blue-400 underline"
            onClick={() => onEditSection("response")}
          >
            Edit
          </button>
        </div>

        <p><strong>Best Response:</strong> {response.bestResponse || "Not provided"}</p>
        <p><strong>Response Date:</strong> {response.responseDate || "Not provided"}</p>

        <p><strong>Response Modalities:</strong> 
          {response.responseModalities?.length
            ? response.responseModalities.join(", ")
            : "Not provided"}
        </p>

        <p><strong>Response Notes:</strong> {response.responseNotes || "Not provided"}</p>
      </section>

      {/* ---------------- QoL Summary ---------------- */}
      <section className="bg-gray-800 p-4 rounded">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">Quality of Life</h3>
          <button
            className="text-blue-400 underline"
            onClick={() => onEditSection("qol")}
          >
            Edit
          </button>
        </div>

        <p><strong>Physical Well‑Being:</strong> {qol.physicalScore ?? "Not provided"}/10</p>
        <p><strong>Emotional Well‑Being:</strong> {qol.emotionalScore ?? "Not provided"}/10</p>
        <p><strong>Functional Well‑Being:</strong> {qol.functionalScore ?? "Not provided"}/10</p>

        <p><strong>Bladder Symptoms:</strong> 
          {qol.bladderSymptoms?.length
            ? qol.bladderSymptoms.join(", ")
            : "None reported"}
        </p>

        <p><strong>Symptom Notes:</strong> {qol.bladderNotes || "Not provided"}</p>
      </section>

      {/* ---------------- Complete Button ---------------- */}
      <button
        onClick={onComplete}
        className="bg-green-600 px-6 py-3 rounded text-white font-bold"
      >
        Complete Onboarding
      </button>
    </div>
  );
}
