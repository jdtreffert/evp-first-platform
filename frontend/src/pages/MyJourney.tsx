import { useState } from "react";
import JourneyOnboarding from "./journey/JourneyOnboarding";
import JourneyTimeline from "./journey/JourneyTimeline";
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

        <button onClick={() => setTab("profile")}
          className={`px-4 py-2 rounded ${tab === "profile" ? "bg-gray-700" : "bg-gray-800"}`}>
          Profile
        </button>
      </div>

      {/* Content */}
      {tab === "onboarding" && <JourneyOnboarding />}
      {tab === "timeline" && <JourneyTimeline />}
      {tab === "profile" && <JourneyProfile />}
    </div>
  );
}
