import { useState } from "react";

export default function TreatmentStep() {
  const [previousTreatment, setPreviousTreatment] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [physicianPath, setPhysicianPath] = useState("");
  const [patientPath, setPatientPath] = useState("");

  // Conditional detail fields
  const [immunotherapyAgent, setImmunotherapyAgent] = useState("");
  const [immunotherapyNotes, setImmunotherapyNotes] = useState("");

  const [trialName, setTrialName] = useState("");
  const [trialNotes, setTrialNotes] = useState("");

  const [chemoRegimen, setChemoRegimen] = useState("");
  const [radiationType, setRadiationType] = useState("");
  const [chemoRadNotes, setChemoRadNotes] = useState("");

  const [radiationNotes, setRadiationNotes] = useState("");

  const [cystectomyType, setCystectomyType] = useState("");
  const [cystectomyNotes, setCystectomyNotes] = useState("");

  const [platinumRegimen, setPlatinumRegimen] = useState("");
  const [platinumNotes, setPlatinumNotes] = useState("");

  const [otherNotes, setOtherNotes] = useState("");

  const previousOptions = [
    "TURBT",
    "Chemoradiation",
    "Radiation",
    "Cystectomy",
    "Immunotherapy",
    "Platinum chemotherapy",
    "Clinical trial therapy",
    "Other"
  ];

  const currentOptions = [
    "EVP",
    "EV",
    "Pembrolizumab",
    "Chemoradiation",
    "Radiation",
    "Cystectomy",
    "Clinical trial",
    "Surveillance",
    "Other"
  ];

  const physicianOptions = [
    "EV-303/304 pathway",
    "ARCHER pathway",
    "Trimodal therapy",
    "Radical cystectomy",
    "Continued systemic therapy",
    "Surveillance",
    "Clinical trial",
    "Other"
  ];

  const patientOptions = [
    "Surveillance",
    "Continue EVP",
    "Radiation",
    "Chemoradiation",
    "Cystectomy",
    "Clinical trial",
    "Other",
    "Not sure yet",
    "Undecided / waiting for more tests"
  ];

  return (
    <div className="space-y-8 text-white">

      {/* Previous Treatment */}
      <section>
        <h3 className="text-lg font-bold mb-2">Previous Treatment</h3>
        <p className="text-sm mb-4">
          Select all treatments you received before starting EVP First.
        </p>

        {previousOptions.map((opt) => (
          <label key={opt} className="block">
            <input
              type="checkbox"
              checked={previousTreatment.includes(opt)}
              onChange={() => {
                setPreviousTreatment((prev) =>
                  prev.includes(opt)
                    ? prev.filter((x) => x !== opt)
                    : [...prev, opt]
                );
              }}
            />
            <span className="ml-2">{opt}</span>
          </label>
        ))}

        {/* Conditional fields */}

        {previousTreatment.includes("Immunotherapy") && (
          <div className="mt-4">
            <label className="block mb-2">Immunotherapy Agent</label>
            <input
              type="text"
              className="bg-gray-800 p-2 rounded w-full"
              value={immunotherapyAgent}
              onChange={(e) => setImmunotherapyAgent(e.target.value)}
              placeholder="e.g., Pembrolizumab"
            />

            <label className="block mt-4 mb-2">Notes (optional)</label>
            <textarea
              className="bg-gray-800 p-2 rounded w-full"
              value={immunotherapyNotes}
              onChange={(e) => setImmunotherapyNotes(e.target.value)}
              placeholder="Any additional details..."
            />
          </div>
        )}

        {previousTreatment.includes("Clinical trial therapy") && (
          <div className="mt-4">
            <label className="block mb-2">Trial Name</label>
            <input
              type="text"
              className="bg-gray-800 p-2 rounded w-full"
              value={trialName}
              onChange={(e) => setTrialName(e.target.value)}
              placeholder="e.g., ARCHER, EV-303"
            />

            <label className="block mt-4 mb-2">Notes (optional)</label>
            <textarea
              className="bg-gray-800 p-2 rounded w-full"
              value={trialNotes}
              onChange={(e) => setTrialNotes(e.target.value)}
              placeholder="Any additional details..."
            />
          </div>
        )}

        {previousTreatment.includes("Chemoradiation") && (
          <div className="mt-4">
            <label className="block mb-2">Chemo Regimen</label>
            <input
              type="text"
              className="bg-gray-800 p-2 rounded w-full"
              value={chemoRegimen}
              onChange={(e) => setChemoRegimen(e.target.value)}
              placeholder="e.g., Cisplatin + Gemcitabine"
            />

            <label className="block mt-4 mb-2">Radiation Type</label>
            <input
              type="text"
              className="bg-gray-800 p-2 rounded w-full"
              value={radiationType}
              onChange={(e) => setRadiationType(e.target.value)}
              placeholder="e.g., IMRT"
            />

            <label className="block mt-4 mb-2">Notes (optional)</label>
            <textarea
              className="bg-gray-800 p-2 rounded w-full"
              value={chemoRadNotes}
              onChange={(e) => setChemoRadNotes(e.target.value)}
              placeholder="Any additional details..."
            />
          </div>
        )}

        {previousTreatment.includes("Radiation") && (
          <div className="mt-4">
            <label className="block mb-2">Radiation Notes</label>
            <textarea
              className="bg-gray-800 p-2 rounded w-full"
              value={radiationNotes}
              onChange={(e) => setRadiationNotes(e.target.value)}
              placeholder="e.g., IMRT, dose, schedule"
            />
          </div>
        )}

        {previousTreatment.includes("Cystectomy") && (
          <div className="mt-4">
            <label className="block mb-2">Cystectomy Type</label>
            <input
              type="text"
              className="bg-gray-800 p-2 rounded w-full"
              value={cystectomyType}
              onChange={(e) => setCystectomyType(e.target.value)}
              placeholder="e.g., Radical, Partial, Nerve-sparing"
            />

            <label className="block mt-4 mb-2">Notes (optional)</label>
            <textarea
              className="bg-gray-800 p-2 rounded w-full"
              value={cystectomyNotes}
              onChange={(e) => setCystectomyNotes(e.target.value)}
              placeholder="Any additional details..."
            />
          </div>
        )}

        {previousTreatment.includes("Platinum chemotherapy") && (
          <div className="mt-4">
            <label className="block mb-2">Platinum Regimen</label>
            <input
              type="text"
              className="bg-gray-800 p-2 rounded w-full"
              value={platinumRegimen}
              onChange={(e) => setPlatinumRegimen(e.target.value)}
              placeholder="e.g., Cisplatin + Gemcitabine"
            />

            <label className="block mt-4 mb-2">Notes (optional)</label>
            <textarea
              className="bg-gray-800 p-2 rounded w-full"
              value={platinumNotes}
              onChange={(e) => setPlatinumNotes(e.target.value)}
              placeholder="Any additional details..."
            />
          </div>
        )}

        {previousTreatment.includes("Other") && (
          <div className="mt-4">
            <label className="block mb-2">Other Treatment Notes</label>
            <textarea
              className="bg-gray-800 p-2 rounded w-full"
              value={otherNotes}
              onChange={(e) => setOtherNotes(e.target.value)}
              placeholder="Describe the treatment..."
            />
          </div>
        )}
      </section>

      {/* Current Treatment Path */}
      <section>
        <h3 className="text-lg font-bold mb-2">Current Treatment Path</h3>
        <select
          className="bg-gray-800 p-2 rounded"
          value={currentPath}
          onChange={(e) => setCurrentPath(e.target.value)}
        >
          <option value="">Select...</option>
          {currentOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </section>

      {/* Physician Recommended Path */}
      <section>
        <h3 className="text-lg font-bold mb-2">Physician Recommended Path</h3>
        <select
          className="bg-gray-800 p-2 rounded"
          value={physicianPath}
          onChange={(e) => setPhysicianPath(e.target.value)}
        >
          <option value="">Select...</option>
          {physicianOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </section>

      {/* Patient Chosen Path */}
      <section>
        <h3 className="text-lg font-bold mb-2">Patient Chosen Path</h3>
        <select
          className="bg-gray-800 p-2 rounded"
          value={patientPath}
          onChange={(e) => setPatientPath(e.target.value)}
        >
          <option value="">Select...</option>
          {patientOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </section>
    </div>
  );
}
