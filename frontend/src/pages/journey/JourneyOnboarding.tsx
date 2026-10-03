import { useState } from "react";
import DiagnosisStep from "./onboarding/DiagnosisStep";
import TreatmentStep from "./onboarding/TreatmentStep";
import ResponseStep from "./onboarding/ResponseStep";
import QoLStep from "./onboarding/QoLStep";
import DiagnosticSummaryStep from "./onboarding/DiagnosticSummaryStep";
import type {
  DiagnosisForm,
  QualityOfLifeForm,
  ResponseForm,
  TreatmentForm,
} from "./onboarding/types";

export default function JourneyOnboarding() {
  // Shared onboarding state
  const [diagnosis, setDiagnosis] = useState<DiagnosisForm>({});
  const [treatment, setTreatment] = useState<TreatmentForm>({});
  const [response, setResponse] = useState<ResponseForm>({});
  const [qol, setQol] = useState<QualityOfLifeForm>({});

  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState(false);

  const goToStep = (n: number) => setStep(n);
  const handleCompleteOnboarding = () => setCompleted(true);

  return (
    <div className="text-white p-6 space-y-6">

      <h2 className="text-xl font-bold mb-4">Onboarding</h2>
      <p className="rounded border border-amber-700 bg-amber-950/50 p-3 text-sm text-amber-100">
        This onboarding draft is not saved yet. Event submission will be connected to your account in the next workflow.
      </p>
      {completed && <p role="status">Draft complete. It has not been submitted or saved.</p>}

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
          onEditSection={(section: string) => {
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
