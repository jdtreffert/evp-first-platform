import type { Dispatch, SetStateAction } from "react";

export interface DiagnosisForm {
  diagnosisDate?: string;
  histology?: string;
  symptoms?: string;
  initialImaging?: string[];
  initialCystoscopyNotes?: string;
  clinicalStage?: string;
  tStage?: string;
  nStage?: string;
  mStage?: string;
  variantHistology?: string[];
}

export interface TreatmentForm {
  turbtDate?: string;
  turbtNotes?: string;
  bcgStart?: string;
  bcgEnd?: string;
  bcgNotes?: string;
  chemoRegimen?: string;
  chemoStart?: string;
  chemoEnd?: string;
  chemoNotes?: string;
  ioAgent?: string;
  ioStart?: string;
  ioEnd?: string;
  ioNotes?: string;
  radiationStart?: string;
  radiationEnd?: string;
  radiationNotes?: string;
  rcDate?: string;
  rcNotes?: string;
}

export interface ResponseForm {
  bestResponse?: string;
  responseDate?: string;
  responseModalities?: string[];
  responseNotes?: string;
}

export interface QualityOfLifeForm {
  physicalScore?: number;
  emotionalScore?: number;
  functionalScore?: number;
  bladderSymptoms?: string[];
  bladderNotes?: string;
}

export type FormSetter<T> = Dispatch<SetStateAction<T>>;
export type OnboardingSection = "diagnosis" | "treatment" | "response" | "qol";
