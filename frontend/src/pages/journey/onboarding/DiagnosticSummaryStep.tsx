import React from "react";

export default function DiagnosticSummaryStep({
  diagnosis,
  treatment,
  response,
  qol,
  onEditSection,
  onComplete
}: {
  diagnosis: any;
  treatment: any;
  response: any;
  qol: any;
  onEditSection: (section: string) => void;
  onComplete: () => void;
}) {
  return (
    <div className="space-y-10 text-white">

      {/* Diagnosis Summary */}
      <section className="bg-gray-800 p-4 rounded">
        <h3 className="text-xl font-bold mb-4">Diagnosis Summary</h3>

        <p><strong>Date of Diagnosis:</strong> {diagnosis.date || "Not provided"}</p>
        <p><strong>Stage:</strong> {diagnosis.stage || "Not provided"}</p>
        <p><strong>Primary Histology:</strong> {diagnosis.histology || "Not provided"}</p>

        <p className="mt-2">
          <strong>Variant Histology:</strong>{" "}
          {diagnosis.variantHistology?.length > 0
            ? diagnosis.variantHistology.join(", ")
            : "None"}
        </p>

        {diagnosis.variantNotes && (
          <p className="mt-1 text-sm text-gray-300">
            Notes: {diagnosis.variantNotes}
          </p>
        )}

        <p className="mt-4"><strong>Initial Symptoms:</strong></p>
        <p className="text-sm text-gray-300">{diagnosis.symptoms || "None provided"}</p>

        <p className="mt-4"><strong>Initial Diagnostic Tests:</strong></p>
        <p>{diagnosis.initialImaging?.join(", ") || "None provided"}</p>

        {diagnosis.initialCystoscopyNotes && (
          <p className="mt-1 text-sm text-gray-300">
            Cystoscopy Notes: {diagnosis.initialCystoscopyNotes}
          </p>
        )}

        <button
          className="mt-4 underline text-blue-300"
          onClick={() => onEditSection("diagnosis")}
        >
          Edit Diagnosis
        </button>
      </section>

      {/* Treatment Summary */}
      <section className="bg-gray-800 p-4 rounded">
        <h3 className="text-xl font-bold mb-4">Treatment Summary</h3>

        <p><strong>Previous Treatment:</strong></p>
        <p>{treatment.previousTreatment?.join(", ") || "None"}</p>

        {treatment.detailNotes && (
          <p className="mt-2 text-sm text-gray-300">
            Details: {treatment.detailNotes}
          </p>
        )}

        <p className="mt-4"><strong>Current Treatment Path:</strong> {treatment.currentPath || "Not provided"}</p>
        <p><strong>Physician Recommended Path:</strong> {treatment.physicianPath || "Not provided"}</p>
        <p><strong>Patient Chosen Path:</strong> {treatment.patientPath || "Not provided"}</p>

        <button
          className="mt-4 underline text-blue-300"
          onClick={() => onEditSection("treatment")}
        >
          Edit Treatment
        </button>
      </section>

      {/* Response Summary */}
      <section className="bg-gray-800 p-4 rounded">
        <h3 className="text-xl font-bold mb-4">Response Summary</h3>

        <p><strong>Best Response:</strong> {response.bestResponse || "Not provided"}</p>
        <p><strong>Date of Best Response:</strong> {response.responseDate || "Not provided"}</p>

        <p className="mt-2">
          <strong>Response Determined By:</strong>{" "}
          {response.responseModalities?.join(", ") || "None provided"}
        </p>

        {response.responseNotes && (
          <p className="mt-1 text-sm text-gray-300">
            Notes: {response.responseNotes}
          </p>
        )}

        <button
          className="mt-4 underline text-blue-300"
          onClick={() => onEditSection("response")}
        >
          Edit Response
        </button>
      </section>

      {/* QoL Summary */}
      <section className="bg-gray-800 p-4 rounded">
        <h3 className="text-xl font-bold mb-4">Quality of Life Summary</h3>

        <p><strong>Physical Well-Being:</strong> {qol.physicalScore}/10</p>
        <p><strong>Emotional Well-Being:</strong> {qol.emotionalScore}/10</p>
        <p><strong>Functional Well-Being:</strong> {qol.functionalScore}/10</p>

        <p className="mt-4"><strong>Bladder Symptoms:</strong></p>
        <p>{qol.bladderSymptoms?.join(", ") || "None"}</p>

        {qol.bladderNotes && (
          <p className="mt-1 text-sm text-gray-300">
            Notes: {qol.bladderNotes}
          </p>
        )}

        <button
          className="mt-4 underline text-blue-300"
          onClick={() => onEditSection("qol")}
        >
          Edit QoL
        </button>
      </section>

      {/* Continue Button */}
      <div className="text-center">
        <button
          className="bg-blue-600 px-6 py-3 rounded text-white font-bold"
          onClick={onComplete}
        >
          Continue to My Journey
        </button>
      </div>
    </div>
  );
}
