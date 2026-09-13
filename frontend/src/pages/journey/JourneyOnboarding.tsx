import { useState } from "react";
import DiagnosisStep from "./onboarding/DiagnosisStep";
import TreatmentStep from "./onboarding/TreatmentStep";
import ResponseStep from "./onboarding/ResponseStep";
import QoLStep from "./onboarding/QoLStep";
import DiagnosticSummaryStep from "./onboarding/DiagnosticSummaryStep";
import { useNavigate } from "react-router-dom";

export default function JourneyOnboarding() {
  const navigate = useNavigate();

  // Shared onboarding state
  const [diagnosis, setDiagnosis] = useState({});
  const [treatment, setTreatment] = useState({});
  const [response, setResponse] = useState({});
  const [qol, setQol] = useState({});

  const [step, setStep] = useState(1);

  const goToStep = (n: number) => setStep(n);

  return (
    <div className="text-white p-6 space-y-6">

      <h2 className="text-xl font-bold mb-4">Onboarding</h2>

      {/* Stepper */}
      <div className="flex space-x-4 mb-6">
        {["Diagnosis", "Treatment", "Response", "Quality of Life", "Summary"].map(
          (label, i) => (
            <button
              key={i}
              onClick={() => goToStep(i + 1)}
              className={`px-4 py-2 rounded ${
                step === i + 1 ? "bg-gray-700" : "bg-gray-800"
              }`}
            >
              {label}
            </button>
          )
        )}
      </div>

      {/* Step Content */}
      {step === 1 && (
        <DiagnosisStep
          onNext={() => goToStep(2)}
          setDiagnosis={setDiagnosis}
          diagnosis={diagnosis}
        />
      )}

      {step === 2 && (
        <TreatmentStep
          onNext={() => goToStep(3)}
          onBack={() => goToStep(1)}
          setTreatment={setTreatment}
          treatment={treatment}
        />
      )}

      {step === 3 && (
        <ResponseStep
          onNext={() => goToStep(4)}
          onBack={() => goToStep(2)}
          setResponse={setResponse}
          response={response}
        />
      )}

      {step === 4 && (
        <QoLStep
          onNext={() => goToStep(5)}
          onBack={() => goToStep(3)}
          setQol={setQol}
          qol={qol}
        />
      )}

      {step === 5 && (
        <DiagnosticSummaryStep
          diagnosis={diagnosis}
          treatment={treatment}
          response={response}
          qol={qol}
          onEditSection={(section) => {
            if (section === "diagnosis") goToStep(1);
            if (section === "treatment") goToStep(2);
            if (section === "response") goToStep(3);
            if (section === "qol") goToStep(4);
          }}
          onComplete={handleCompleteOnboarding}
        />
      )}
    </div>
  );
}

const handleCompleteOnboarding = async () => {
  try {
    const response = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        diagnosis,
        treatment,
        responseData: response,   // rename if needed
        qol,
        user: {
          email: currentUser.email,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName
        }
      })
    });

    if (!response.ok) {
      console.error("Failed to complete onboarding");
      return;
    }

    // Redirect to dashboard
    navigate("/journey");
  } catch (err) {
    console.error("Error completing onboarding", err);
  }
};
