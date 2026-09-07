import { useState } from "react";

export default function QoLStep() {
  const [physicalScore, setPhysicalScore] = useState(5);
  const [emotionalScore, setEmotionalScore] = useState(5);
  const [functionalScore, setFunctionalScore] = useState(5);

  const [bladderSymptoms, setBladderSymptoms] = useState<string[]>([]);
  const [bladderNotes, setBladderNotes] = useState("");

  const symptomOptions = [
    "Urgency",
    "Frequency",
    "Pain or burning",
    "Blood in urine",
    "Incontinence",
    "Nighttime urination",
    "Other"
  ];

  return (
    <div className="space-y-8 text-white">

      {/* Physical Well-Being */}
      <section>
        <h3 className="text-lg font-bold mb-2">Physical Well-Being</h3>
        <p className="text-sm mb-4">
          How would you rate your physical well-being?
        </p>

        <input
          type="range"
          min="0"
          max="10"
          value={physicalScore}
          onChange={(e) => setPhysicalScore(Number(e.target.value))}
          className="w-full"
        />
        <p className="mt-2 text-xs text-gray-400">
          0–3: Severe difficulty • 4–6: Moderate difficulty • 7–8: Mild difficulty • 9–10: Doing well overall
        </p>

        <p className="mt-2 text-sm">Score: {physicalScore}/10</p>
      </section>

      {/* Emotional Well-Being */}
      <section>
        <h3 className="text-lg font-bold mb-2">Emotional Well-Being</h3>
        <p className="text-sm mb-4">
          How would you rate your emotional well-being?
        </p>

        <input
          type="range"
          min="0"
          max="10"
          value={emotionalScore}
          onChange={(e) => setEmotionalScore(Number(e.target.value))}
          className="w-full"
        />
        <p className="mt-2 text-xs text-gray-400">
          0–3: Feeling overwhelmed • 4–6: Ups and downs but managing • 7–8: Mostly stable • 9–10: Emotionally resilient
        </p>

        <p className="mt-2 text-sm">Score: {emotionalScore}/10</p>
      </section>

      {/* Functional Well-Being */}
      <section>
        <h3 className="text-lg font-bold mb-2">Functional Well-Being</h3>
        <p className="text-sm mb-4">
          How would you rate your ability to perform daily activities?
        </p>

        <input
          type="range"
          min="0"
          max="10"
          value={functionalScore}
          onChange={(e) => setFunctionalScore(Number(e.target.value))}
          className="w-full"
        />
        <p className="mt-2 text-xs text-gray-400">
          0–3: Daily tasks very difficult • 4–6: Some tasks but need help/rest • 7–8: Manage most tasks • 9–10: Functioning normally
        </p>

        <p className="mt-2 text-sm">Score: {functionalScore}/10</p>
      </section>

      {/* Bladder-Specific Symptoms */}
      <section>
        <h3 className="text-lg font-bold mb-2">Bladder-Specific Symptoms</h3>
        <p className="text-sm mb-4">
          Select any symptoms you are currently experiencing.
        </p>

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
    </div>
  );
}
