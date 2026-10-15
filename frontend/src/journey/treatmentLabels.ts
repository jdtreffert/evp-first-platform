/**
 * Short names for treatments, used only to label markers in the journey views. They are display text and
 * never change the recorded Treatment_Name. Each Treatment_Name option has an entry so that adding an option to
 * the schema fails a test until its label has been decided.
 *
 *  - `short`: the label drawn on a marker. When absent the option text is used as it is.
 *  - `full`: the full name, shown in a legend of the abbreviations a view uses, for readers who do not know them.
 */
export interface TreatmentLabel {
  short?: string;
  full?: string;
}

export const TREATMENT_LABELS: Record<string, TreatmentLabel> = {
  EVP: { full: "Enfortumab vedotin + pembrolizumab" },
  EV: { full: "Enfortumab vedotin" },
  Pembrolizumab: { short: "pembro", full: "Pembrolizumab" },
  Nivolumab: { short: "nivo", full: "Nivolumab" },
  Gemcitabine: { short: "gem", full: "Gemcitabine" },
  Cisplatin: { short: "cis", full: "Cisplatin" },
  Carboplatin: { short: "carbo", full: "Carboplatin" },
  "Gem/Cis": { full: "Gemcitabine + cisplatin" },
  "Gem/Carbo": { full: "Gemcitabine + carboplatin" },
  "Other systemic therapy": {},
  BCG: { full: "Bacillus Calmette-Guérin" },
  "BCG+Interferon": { short: "BCG+IFN", full: "Bacillus Calmette-Guérin + interferon" },
  // The wording of these two short names is still to be confirmed, so they keep their full text for now.
  "Gemcitabine intravesical": {},
  "Docetaxel intravesical": {},
  "Gem/Docetaxel": { full: "Gemcitabine + docetaxel" },
  "Mitomycin C": { short: "MMC", full: "Mitomycin C" },
  "Other intravesical therapy": {},
  "Radiation therapy": { short: "RT", full: "Radiation therapy" },
  Chemoradiation: { short: "CRT", full: "Chemoradiation" },
  IMRT: { full: "Intensity-modulated radiation therapy" },
  SBRT: { full: "Stereotactic body radiation therapy" },
  "Proton therapy": {},
  "Other radiation": {},
  TURBT: { full: "Transurethral resection of bladder tumor" },
  "Repeat TURBT": {},
  cystectomy: {},
  "Partial cystectomy": {},
  "Lymph node dissection": {},
  "Growth factor support": {},
  "Steroid premedication": {},
  "Antiemetic regimen": {},
  "Other supportive care": {},
  Other: {},
};

/** The label for a treatment on a marker: its short name when it has one, else the recorded name; null with no name. */
export function treatmentShortName(name: string | null | undefined): string | null {
  if (!name) return null;
  const entry = Object.prototype.hasOwnProperty.call(TREATMENT_LABELS, name) ? TREATMENT_LABELS[name] : undefined;
  return entry?.short ?? name;
}

/** The full name to show beside an abbreviation, when the abbreviation differs from it. */
export function treatmentFullName(name: string | null | undefined): string | null {
  if (!name || !Object.prototype.hasOwnProperty.call(TREATMENT_LABELS, name)) return null;
  const { full } = TREATMENT_LABELS[name];
  const short = treatmentShortName(name);
  return full && short && full.toLowerCase() !== short.toLowerCase() ? full : null;
}
