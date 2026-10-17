import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";

export interface DetailRow {
  key: string;
  label: string;
  value: string;
}

/** The label for a stored detail key: "tumorStage" becomes "tumor Stage"; the card capitalises it. */
function labelFor(key: string): string {
  return key.replaceAll(/([A-Z])/g, " $1");
}

/**
 * The recorded details of an event as rows for the card, leaving out those not recorded. For a Diagnosis, the T, N
 * and M values are shown together in one row, "TNM Stage", in the order T N M with only the ones recorded
 * ("T2 N2 M0", or "T2 M0" when N is not recorded), where the first of them would have been. Nothing is filled in for
 * a value that is missing, and a missing T, N and M gives no row. The row is a way of showing them: the separate
 * values stay in the event.
 */
export function detailRows(event: UnifiedEvent): DetailRow[] {
  const entries = event.eventDetails
    ? Object.entries(event.eventDetails).filter(([, value]) => value !== null && value !== "")
    : [];
  const asValue = (value: unknown) => (Array.isArray(value) ? value.join(", ") : String(value));

  const tnmKeys = event.eventType === "Diagnosis" ? ["tumorT", "tumorN", "tumorM"] : [];
  const tnm = tnmKeys
    .map((key) => event.eventDetails?.[key])
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map(String)
    .join(" ");

  const rows: DetailRow[] = [];
  let tnmShown = false;
  for (const [key, value] of entries) {
    if (tnmKeys.includes(key)) {
      if (!tnmShown && tnm !== "") rows.push({ key: "tnmStage", label: "TNM Stage", value: tnm });
      tnmShown = true;
      continue;
    }
    rows.push({ key, label: labelFor(key), value: asValue(value) });
  }
  return rows;
}
