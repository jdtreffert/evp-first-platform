import { createEvent } from "../api/createEvent";
import { OnboardingEventInput } from "../types/onboarding";


export async function mapOnboardingToEvents(input: OnboardingEventInput) {
  const {
    patientId,
    diagnosis,
    treatment,
    response,
    qol,
    imaging,
    turbt
  } = input;

  const events = [];


  if (diagnosis) {
    events.push(
      await createEvent({
        EventSummary: "Diagnosis",
        EventType: "Diagnosis",
        EventCategory: "Diagnostic",
        EventDate: diagnosis.date,
        EventDetails: JSON.stringify({
          stage: diagnosis.stage,
          histology: diagnosis.histology,
          variantHistology: diagnosis.variantHistology,
          initialSymptoms: diagnosis.symptoms,
          initialImaging: diagnosis.imagingSummary,
          initialCystoscopy: diagnosis.cystoscopySummary
        }),
        MasterId: patientId
      })
    );
  }

  if (turbt) {
    events.push(
      await createEvent({
        EventSummary: "TURBT",
        EventType: "TURBT",
        EventCategory: "Diagnostic",
        EventDate: turbt.date,
        EventDetails: JSON.stringify({
          depth: turbt.depth,
          margins: turbt.margins,
          lvi: turbt.lvi,
          variantHistology: turbt.variantHistology,
          surgeonNotes: turbt.surgeonNotes
        }),
        MasterId: patientId
      })
    );
  }

  if (imaging) {
    events.push(
      await createEvent({
        EventSummary: "Initial Imaging",
        EventType: "Imaging",
        EventCategory: "Diagnostic",
        EventDate: imaging.date,
        EventDetails: JSON.stringify({
          modality: imaging.modality,
          findings: imaging.findings,
          impression: imaging.impression
        }),
        MasterId: patientId
      })
    );
  }

  if (treatment) {
    events.push(
      await createEvent({
        EventSummary: "Treatment Started",
        EventType: "Treatment Start",
        EventCategory: "Treatment",
        EventDate: treatment.startDate,
        EventDetails: JSON.stringify({
          regimen: treatment.regimen,
          cycle: treatment.cycle,
          intent: treatment.intent,
          physicianPath: treatment.physicianRecommendation,
          patientPath: treatment.patientChoice
        }),
        MasterId: patientId
      })
    );
  }

  if (response) {
    events.push(
      await createEvent({
        EventSummary: "Best Response",
        EventType: "Best Response",
        EventCategory: "Outcome",
        EventDate: response.date,
        EventDetails: JSON.stringify({
          response: response.category,
          modality: response.modality,
          notes: response.notes
        }),
        MasterId: patientId
      })
    );
  }

  if (qol) {
    events.push(
      await createEvent({
        EventSummary: "Baseline QoL",
        EventType: "Major Event",
        EventCategory: "Outcome",
        EventDate: qol.date,
        EventDetails: JSON.stringify({
          physical: qol.physical,
          emotional: qol.emotional,
          urinary: qol.urinary,
          pain: qol.pain,
          fatigue: qol.fatigue
        }),
        MasterId: patientId
      })
    );
  }

  return events;
}
