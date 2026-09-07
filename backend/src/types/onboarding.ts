export interface DiagnosisData {
  date: string;
  stage: string;
  histology: string;
  variantHistology?: string;
  symptoms?: string;
  imagingSummary?: string;
  cystoscopySummary?: string;
}

export interface TURBTData {
  date: string;
  depth?: string;
  margins?: string;
  lvi?: string;
  variantHistology?: string;
  surgeonNotes?: string;
}

export interface ImagingData {
  date: string;
  modality: string;
  findings?: string;
  impression?: string;
}

export interface TreatmentData {
  startDate: string;
  regimen: string;
  cycle?: string;
  intent?: string;
  physicianRecommendation?: string;
  patientChoice?: string;
}

export interface ResponseData {
  date: string;
  category: string;
  modality?: string;
  notes?: string;
}

export interface QoLData {
  date: string;
  physical?: string;
  emotional?: string;
  urinary?: string;
  pain?: string;
  fatigue?: string;
}

export interface OnboardingEventInput {
  patientId: string;
  diagnosis?: DiagnosisData;
  treatment?: TreatmentData;
  response?: ResponseData;
  qol?: QoLData;
  imaging?: ImagingData;
  turbt?: TURBTData;
}

