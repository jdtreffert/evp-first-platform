import { useState, useEffect } from "react";

export default function ResponseStep({ response, setResponse, onNext, onBack }) {
  // Local state initialized from parent
  const [bestResponse, setBestResponse] = useState(response.bestResponse || "");
  const [responseDate, setResponseDate] = useState(response.responseDate || "");
  const [responseModalities, setResponseModalities] = useState(
    response.responseModalities || []
  );
  const [responseNotes, setResponseNotes] = useState(response.responseNotes || "");

  // Sync local state when navigating back
  useEffect(() => {
    setBestResponse(response.bestResponse || "");
    setResponseDate(response.responseDate || "");
    setResponseModalities(response.responseModalities || []);
    setResponseNotes(response.responseNotes || "");
  }, [response]);

  const responseOptions = [
    "Complete Response (CR)",
    "Partial Response (PR)",
    "Stable Disease (SD)",
    "Progressive Disease (PD)",
    "Not sure"
  ];

  const modalityOptions = [
    "CT",
    "MRI",
    "PET/CT",
    "Cystoscopy",
    "Cytology",
    "ctDNA",
    "Other"
  ];

  const handleNext = () => {
    setResponse({
      bestResponse,
      responseDate,
      responseModalities,
      responseNotes
    });

    onNext();
  };

  return (
    <div className="space-y-10 text-white">

      {/* Best Response */}
      <section>
        <h3 className="text-lg font-bold mb-2">Best Response</h3>
        <p className="text-sm mb-4">
          Select the best response you achieved during treatment.
        </p>

        <select
          className="bg-gray-800 p-2 rounded"
          value={bestResponse}
          onChange={(e) => setBestResponse(e.target.value)}
        >
          <option value="">Select...</option>
          {responseOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </section>

      {/* Date of Best Response */}
      <section>
        <h3 className="text-lg font-bold mb-2">Date of Best Response</h3>
        <input
          type="date"
          className="bg-gray-800 p-2 rounded"
          value={responseDate}
          onChange={(e) => setResponseDate(e.target.value)}
        />
      </section>

      {/* Modality Used */}
      <section>
        <h3 className="text-lg font-bold mb-2">How Was Response Determined?</h3>
        <p className="text-sm mb-4">
          Select all tests or evaluations used to determine your response.
        </p>

        {modalityOptions.map((opt) => (
          <label key={opt} className="block">
            <input
              type="checkbox"
              checked={responseModalities.includes(opt)}
              onChange={() => {
                setResponseModalities((prev) =>
                  prev.includes(opt)
                    ? prev.filter((x) => x !== opt)
                    : [...prev, opt]
                );
              }}
            />
            <span className="ml-2">{opt}</span>
          </label>
        ))}

        {/* Optional notes */}
        {responseModalities.length > 0 && (
          <div className="mt-4">
            <label className="block mb-2">Response Notes (optional)</label>
            <textarea
              className="bg-gray-800 p-2 rounded w-full"
              value={responseNotes}
              onChange={(e) => setResponseNotes(e.target.value)}
              placeholder="Add any details about how your response was evaluated..."
            />
          </div>
        )}
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
