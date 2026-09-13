import { useState, useEffect } from "react";

export default function QoLStep({ qol, setQol, onNext, onBack }) {
  // Local state initialized from parent
  const [physicalScore, setPhysicalScore] = useState(qol.physicalScore || 5);
  const [emotionalScore, setEmotionalScore] = useState(qol.emotionalScore || 5);
  const [functionalScore, setFunctionalScore] = useState(qol.functionalScore || 5);

  const [bladderSymptoms, setBladderSymptoms] = useState(
    qol.bladderSymptoms || []
  );
  const [bladderNotes, setBladderNotes] = useState(qol.bladderNotes || "");

  // Sync local state when navigating back
  useEffect(() => {
    setPhysicalScore(qol.physicalScore || 5);
    setEmotionalScore(qol.emotionalScore || 5);
    setFunctionalScore(qol.functionalScore || 5);
    setBladderSymptoms(qol.bladderSymptoms || []);
    setBladderNotes(qol.bladderNotes || "");
  }, [qol]);

  const symptomOptions = [
    "Urgency",
    "Frequency",
    "Pain or burning",
    "Blood in urine",
    "Incontinence",
    "Nighttime urination",
    "Other"
  ];

  const handleNext = () => {
    setQol({
      physicalScore,
      emotionalScore,
      functionalScore,
      bladderSymptoms,
      bladderNotes
    });

    onNext();
  };

  return (
    <div className="space-y-10 text-white">

      {/* Physical Well-Being */}
      <section>
        <h3 className="text-lg font-bold mb-2">Physical Well-Being</h3>
        <p className="text-sm mb-4">How would you rate your physical well-being?</p>

        <input
          type="range"
          min="0"
          max="10"
          value={physicalScore}
          onChange={(e) => setPhysicalScore(Number(e.target.value))}
          className="w-full"
        />
        <p className="mt-2 text-sm">Score: {physicalScore}/10</p>
      </section>

      {/* Emotional Well-Being */}
      <section>
        <h3 className="text-lg font-bold mb-2">Emotional Well-Being</h3>
        <p className="text-sm mb-4">How would you rate your emotional well-being?</p>

        <input
          type="range"
          min="0"
          max="10"
          value={emotionalScore}
          onChange={(e) => setEmotionalScore(Number(e.target.value))}
          className="w-full"
        />
        <p className="mt-2 text-sm">Score: {emotionalScore}/10</p>
      </section>

      {/* Functional Well-Being */}
      <section>
        <h3 className="text-lg font-bold mb-2">Functional Well-Being</h3>
        <p className="text-sm mb-4">How would you rate your ability to perform daily activities?</p>

        <input
          type="range"
          min="0"
          max="10"
          value={functionalScore}
          onChange={(e) => setFunctionalScore(Number(e.target.value))}
          className="w-full"
        />
        <p className="mt-2 text-sm">Score: {functionalScore}/10</p>
      </section>

      {/* Bladder-Specific Symptoms */}
      <section>
        <h3 className="text-lg font-bold mb-2">Bladder-Specific Symptoms</h3>
        <p className="text-sm mb-4">Select any symptoms you are currently experiencing.</p>

        {symptomOptions.map((opt) => (
          <label key={opt} className="block">
            <input
              type="checkbox"
              checked={bladderSymptoms.includes(opt)}
              onChange={() => {
                setBladderSymptoms((prev) =>
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
        {bladderSymptoms.length > 0 && (
          <div className="mt-4">
            <label className="block mb-2">Symptom Notes (optional)</label>
            <textarea
              className="bg-gray-800 p-2 rounded w-full"
              value={bladderNotes}
              onChange={(e) => setBladderNotes(e.target.value)}
              placeholder="Add any details about your symptoms..."
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
