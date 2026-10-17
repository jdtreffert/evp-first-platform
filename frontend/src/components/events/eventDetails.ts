import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { eventFieldCatalog } from "../../../../backend/src/schemas/eventFieldCatalog";

export interface DetailRow {
  key: string;
  label: string;
  /** The value as shown, with its units when it has them ("108 mg"). */
  value: string;
  /** Free text, shown under its label; every other row is one line, "Label: value". */
  freeText: boolean;
}

const compact = (name: string) => name.replaceAll("_", "").toLowerCase();

/** The schema fields that hold free text, by name without underscores or case, as the detail keys are written. */
const freeTextNames = new Set(
  Object.values(eventFieldCatalog).filter((field) => field.kind === "longText").map((field) => compact(field.name)),
);

/** A detail key that names free text even where it does not match a schema name exactly. */
const FREE_TEXT_SUFFIXES = ["Notes", "Details", "Description"];

/** A value this long, or on several lines, would not sit well beside its label. */
const LONG_VALUE_LENGTH = 80;

function isFreeText(key: string, value: unknown): boolean {
  return (
    freeTextNames.has(compact(key)) ||
    FREE_TEXT_SUFFIXES.some((suffix) => key.endsWith(suffix)) ||
    (typeof value === "string" && (value.includes("\n") || value.length > LONG_VALUE_LENGTH))
  );
}

/**
 * The label for a stored detail key, split at word boundaries only and with the first letter capitalised:
 * "tumorStage" becomes "Tumor Stage" and "ctDNAVendor" becomes "ctDNA Vendor" (the assay names ctDNA and utDNA keep
 * their lower-case first letter), not "Ct D N A Vendor".
 */
function labelFor(key: string): string {
  const words = key.replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2").replaceAll(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  const assay = words.match(/^(ct|ut) DNA(?= |$)/);
  return assay ? `${assay[1]}DNA${words.slice(assay[0].length)}` : words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The recorded details of an event as rows for the card, leaving out those not recorded.
 *
 * - A value is one line, "Label: value". Free text (a notes field, a long or multi-line value) is the exception and
 *   is shown under its label.
 * - A value followed by its units is one line with the units after it ("treatment Dose: 108 mg"). The units are
 *   found by name: `treatmentDoseUnits` and `symptomDurationUnits` follow the key without "Units", `ctDNAUnits` and
 *   `utDNAUnits` follow `ctDNAValue` and `utDNAValue`. Units with no value are left as their own row, never hidden.
 * - For a Diagnosis, the T, N and M values are one row, "TNM Stage", in the order T N M with only the ones recorded
 *   ("T2 N2 M0", or "T2 M0" when N is not recorded), where the first of them would have been.
 *
 * Nothing is filled in for a value that is missing. These are ways of showing the details: the stored values stay as
 * they are in the event.
 */
export function detailRows(event: UnifiedEvent): DetailRow[] {
  const entries = event.eventDetails
    ? Object.entries(event.eventDetails).filter(([, value]) => value !== null && value !== "")
    : [];
  const present = new Map(entries);
  const asValue = (value: unknown) => (Array.isArray(value) ? value.join(", ") : String(value));

  // Which unit entry follows which value, when both are recorded.
  const unitsFor = new Map<string, string>();
  const consumed = new Set<string>();
  for (const [key] of entries) {
    if (!key.endsWith("Units")) continue;
    const base = key.slice(0, -"Units".length);
    const valueKey = [base, `${base}Value`].find((candidate) => present.has(candidate));
    if (valueKey) {
      unitsFor.set(valueKey, asValue(present.get(key)));
      consumed.add(key);
    }
  }

  const tnmKeys = event.eventType === "Diagnosis" ? ["tumorT", "tumorN", "tumorM"] : [];
  const tnm = tnmKeys
    .filter((key) => present.has(key))
    .map((key) => String(present.get(key)))
    .join(" ");

  const rows: DetailRow[] = [];
  let tnmShown = false;
  for (const [key, value] of entries) {
    if (consumed.has(key)) continue;
    if (tnmKeys.includes(key)) {
      if (!tnmShown && tnm !== "") rows.push({ key: "tnmStage", label: "TNM Stage", value: tnm, freeText: false });
      tnmShown = true;
      continue;
    }
    const units = unitsFor.get(key);
    const text = units ? `${asValue(value)} ${units}` : asValue(value);
    rows.push({ key, label: labelFor(key), value: text, freeText: isFreeText(key, value) });
  }
  return rows;
}
