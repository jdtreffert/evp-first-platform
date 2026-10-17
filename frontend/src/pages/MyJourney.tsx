import { useState } from "react";
import JourneyOnboarding from "./journey/JourneyOnboarding";
import JourneyTimeline from "./journey/JourneyTimeline";
import JourneySummary from "./journey/JourneySummary";
import JourneyDiagnosis from "./journey/JourneyDiagnosis";
import JourneyTreatment from "./journey/JourneyTreatment";
import JourneySurveillance from "./journey/JourneySurveillance";
import JourneyProfile from "./journey/JourneyProfile";

export default function MyJourney() {
  const [tab, setTab] = useState("onboarding");

  return (
    <div className="text-white">
      <h1 className="text-2xl font-bold mb-6">My Journey</h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button onClick={() => setTab("onboarding")}
          className={`px-4 py-2 rounded ${tab === "onboarding" ? "bg-gray-700" : "bg-gray-800"}`}>
          Onboarding
        </button>

        <button onClick={() => setTab("timeline")}
          className={`px-4 py-2 rounded ${tab === "timeline" ? "bg-gray-700" : "bg-gray-800"}`}>
          Timeline
        </button>

        <button onClick={() => setTab("summary")}
          className={`px-4 py-2 rounded ${tab === "summary" ? "bg-gray-700" : "bg-gray-800"}`}>
          Summary
        </button>

        <button onClick={() => setTab("diagnosis")}
          className={`px-4 py-2 rounded ${tab === "diagnosis" ? "bg-gray-700" : "bg-gray-800"}`}>
          Diagnosis
        </button>

        <button onClick={() => setTab("treatment")}
          className={`px-4 py-2 rounded ${tab === "treatment" ? "bg-gray-700" : "bg-gray-800"}`}>
          Treatment
        </button>

        <button onClick={() => setTab("surveillance")}
          className={`px-4 py-2 rounded ${tab === "surveillance" ? "bg-gray-700" : "bg-gray-800"}`}>
          Post-treatment Surveillance
        </button>

        <button onClick={() => setTab("profile")}
          className={`px-4 py-2 rounded ${tab === "profile" ? "bg-gray-700" : "bg-gray-800"}`}>
          Profile
        </button>
      </div>

      {/* Content */}
      {tab === "onboarding" && <JourneyOnboarding />}
      {tab === "timeline" && <JourneyTimeline />}
      {tab === "summary" && <JourneySummary />}
      {tab === "diagnosis" && <JourneyDiagnosis />}
      {tab === "treatment" && <JourneyTreatment />}
      {tab === "surveillance" && <JourneySurveillance />}
      {tab === "profile" && <JourneyProfile />}
    </div>
  );
}
