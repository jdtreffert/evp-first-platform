import { useState, useEffect } from "react";

export default function TreatmentStep({ treatment, setTreatment, onNext, onBack }) {
  // Local state initialized from parent
  const [turbtDate, setTurbtDate] = useState(treatment.turbtDate || "");
  const [turbtNotes, setTurbtNotes] = useState(treatment.turbtNotes || "");

  const [bcgStart, setBcgStart] = useState(treatment.bcgStart || "");
  const [bcgEnd, setBcgEnd] = useState(treatment.bcgEnd || "");
  const [bcgNotes, setBcgNotes] = useState(treatment.bcgNotes || "");

  const [chemoRegimen, setChemoRegimen] = useState(treatment.chemoRegimen || "");
  const [chemoStart, setChemoStart] = useState(treatment.chemoStart || "");
  const [chemoEnd, setChemoEnd] = useState(treatment.chemoEnd || "");
  const [chemoNotes, setChemoNotes] = useState(treatment.chemoNotes || "");

  const [ioAgent, setIoAgent] = useState(treatment.ioAgent || "");
  const [ioStart, setIoStart] = useState(treatment.ioStart || "");
  const [ioEnd, setIoEnd] = useState(treatment.ioEnd || "");
  const [ioNotes, setIoNotes] = useState(treatment.ioNotes || "");

  const [radiationStart, setRadiationStart] = useState(treatment.radiationStart || "");
  const [radiationEnd, setRadiationEnd] = useState(treatment.radiationEnd || "");
  const [radiationNotes, setRadiationNotes] = useState(treatment.radiationNotes || "");

  const [rcDate, setRcDate] = useState(treatment.rcDate || "");
  const [rcNotes, setRcNotes] = useState(treatment.rcNotes || "");

  // Sync local state when navigating back
  useEffect(() => {
    setTurbtDate(treatment.turbtDate || "");
    setTurbtNotes(treatment.turbtNotes || "");

    setBcgStart(treatment.bcgStart || "");
    setBcgEnd(treatment.bcgEnd || "");
    setBcgNotes(treatment.bcgNotes || "");

    setChemoRegimen(treatment.chemoRegimen || "");
    setChemoStart(treatment.chemoStart || "");
    setChemoEnd(treatment.chemoEnd || "");
    setChemoNotes(treatment.chemoNotes || "");

    setIoAgent(treatment.ioAgent || "");
    setIoStart(treatment.ioStart || "");
    setIoEnd(treatment.ioEnd || "");
    setIoNotes(treatment.ioNotes || "");

    setRadiationStart(treatment.radiationStart || "");
    setRadiationEnd(treatment.radiationEnd || "");
    setRadiationNotes(treatment.radiationNotes || "");

    setRcDate(treatment.rcDate || "");
    setRcNotes(treatment.rcNotes || "");
  }, [treatment]);

  const handleNext = () => {
    setTreatment({
      turbtDate,
      turbtNotes,
      bcgStart,
      bcgEnd,
      bcgNotes,
      chemoRegimen,
      chemoStart,
      chemoEnd,
      chemoNotes,
      ioAgent,
      ioStart,
      ioEnd,
      ioNotes,
      radiationStart,
      radiationEnd,
      radiationNotes,
      rcDate,
      rcNotes
    });

    onNext();
  };

  return (
    <div className="space-y-10 text-white">

      {/* TURBT */}
      <section>
        <h3 className="text-lg font-bold mb-2">TURBT</h3>
        <input
          type="date"
          className="bg-gray-800 p-2 rounded"
          value={turbtDate}
          onChange={(e) => setTurbtDate(e.target.value)}
        />
        <textarea
          className="bg-gray-800 p-2 rounded w-full mt-2"
          value={turbtNotes}
          onChange={(e) => setTurbtNotes(e.target.value)}
          placeholder="Notes about TURBT..."
        />
      </section>

      {/* BCG */}
      <section>
        <h3 className="text-lg font-bold mb-2">BCG Treatment</h3>
        <div className="flex space-x-4">
          <input
            type="date"
            className="bg-gray-800 p-2 rounded"
            value={bcgStart}
            onChange={(e) => setBcgStart(e.target.value)}
            placeholder="Start date"
          />
          <input
            type="date"
            className="bg-gray-800 p-2 rounded"
            value={bcgEnd}
            onChange={(e) => setBcgEnd(e.target.value)}
            placeholder="End date"
          />
        </div>
        <textarea
          className="bg-gray-800 p-2 rounded w-full mt-2"
          value={bcgNotes}
          onChange={(e) => setBcgNotes(e.target.value)}
          placeholder="Notes about BCG..."
        />
      </section>

      {/* Chemotherapy */}
      <section>
        <h3 className="text-lg font-bold mb-2">Chemotherapy</h3>
        <input
          type="text"
          className="bg-gray-800 p-2 rounded w-full"
          value={chemoRegimen}
          onChange={(e) => setChemoRegimen(e.target.value)}
          placeholder="Regimen (e.g., Gem/Cis)"
        />
        <div className="flex space-x-4 mt-2">
          <input
            type="date"
            className="bg-gray-800 p-2 rounded"
            value={chemoStart}
            onChange={(e) => setChemoStart(e.target.value)}
          />
          <input
            type="date"
            className="bg-gray-800 p-2 rounded"
            value={chemoEnd}
            onChange={(e) => setChemoEnd(e.target.value)}
          />
        </div>
        <textarea
          className="bg-gray-800 p-2 rounded w-full mt-2"
          value={chemoNotes}
          onChange={(e) => setChemoNotes(e.target.value)}
          placeholder="Notes about chemotherapy..."
        />
      </section>

      {/* Immunotherapy */}
      <section>
        <h3 className="text-lg font-bold mb-2">Immunotherapy</h3>
        <input
          type="text"
          className="bg-gray-800 p-2 rounded w-full"
          value={ioAgent}
          onChange={(e) => setIoAgent(e.target.value)}
          placeholder="Agent (e.g., Pembrolizumab)"
        />
        <div className="flex space-x-4 mt-2">
          <input
            type="date"
            className="bg-gray-800 p-2 rounded"
            value={ioStart}
            onChange={(e) => setIoStart(e.target.value)}
          />
          <input
            type="date"
            className="bg-gray-800 p-2 rounded"
            value={ioEnd}
            onChange={(e) => setIoEnd(e.target.value)}
          />
        </div>
        <textarea
          className="bg-gray-800 p-2 rounded w-full mt-2"
          value={ioNotes}
          onChange={(e) => setIoNotes(e.target.value)}
          placeholder="Notes about immunotherapy..."
        />
      </section>

      {/* Radiation */}
      <section>
        <h3 className="text-lg font-bold mb-2">Radiation Therapy</h3>
        <div className="flex space-x-4">
          <input
            type="date"
            className="bg-gray-800 p-2 rounded"
            value={radiationStart}
            onChange={(e) => setRadiationStart(e.target.value)}
          />
          <input
            type="date"
            className="bg-gray-800 p-2 rounded"
            value={radiationEnd}
            onChange={(e) => setRadiationEnd(e.target.value)}
          />
        </div>
        <textarea
          className="bg-gray-800 p-2 rounded w-full mt-2"
          value={radiationNotes}
          onChange={(e) => setRadiationNotes(e.target.value)}
          placeholder="Notes about radiation..."
        />
      </section>

      {/* Radical Cystectomy */}
      <section>
        <h3 className="text-lg font-bold mb-2">Radical Cystectomy</h3>
        <input
          type="date"
          className="bg-gray-800 p-2 rounded"
          value={rcDate}
          onChange={(e) => setRcDate(e.target.value)}
        />
        <textarea
          className="bg-gray-800 p-2 rounded w-full mt-2"
          value={rcNotes}
          onChange={(e) => setRcNotes(e.target.value)}
          placeholder="Notes about surgery..."
        />
      </section>

      {/* Navigation */}
      <div className="flex space-x-4">
        <button
          onClick={onBack}
          className="bg-gray-700 px-4 py-2 rounded"
        >
          Back
        </button>

        <button
          onClick={handleNext}
          className="bg-blue-600 px-4 py-2 rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
}
