import { ingestEncounter } from "../encounterService";
import { HttpError } from "../../utils/httpError";

const record = (fields: Record<string, unknown>) => ({ id: "rec-1", fields });
const valid = { Encounter_UID: "enc-1", Master_ID: "M1", Encounter_Date: "2026-03-04" };

function issuesOf(fn: () => unknown): { path: string; message: string }[] {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(HttpError);
    return (err as HttpError).details as { path: string; message: string }[];
  }
  throw new Error("expected ingestEncounter to throw");
}

describe("ingestEncounter", () => {
  test("builds an encounter from the required fields", () => {
    expect(ingestEncounter(record(valid))).toMatchObject({
      uid: "enc-1",
      masterId: "M1",
      encounterDate: "2026-03-04",
      encounterType: null,
      encounterSummary: null,
    });
  });

  test("keeps the optional type and summary", () => {
    const encounter = ingestEncounter(record({
      ...valid, Encounter_Type: "Infusion visit", Encounter_Summary: "Cycle 2 infusion",
    }));
    expect(encounter).toMatchObject({ encounterType: "Infusion visit", encounterSummary: "Cycle 2 infusion" });
  });

  test("falls back to the record id when Encounter_UID is not given", () => {
    expect(ingestEncounter(record({ Master_ID: "M1", Encounter_Date: "2026-03-04" })).uid).toBe("rec-1");
  });

  test("accepts a date-time as well as a date", () => {
    expect(ingestEncounter(record({ ...valid, Encounter_Date: "2026-03-04T09:30:00-05:00" })).encounterDate)
      .toBe("2026-03-04T09:30:00-05:00");
  });

  test("requires Encounter_Date, Master_ID and a real date", () => {
    expect(issuesOf(() => ingestEncounter(record({ ...valid, Encounter_Date: undefined })))[0].path).toBe("encounterDate");
    expect(issuesOf(() => ingestEncounter(record({ ...valid, Encounter_Date: "2026-02-30" })))[0].path).toBe("encounterDate");
    expect(issuesOf(() => ingestEncounter(record({ ...valid, Master_ID: "" })))[0].path).toBe("masterId");
  });

  test("Encounter_Type must be a defined option", () => {
    expect(issuesOf(() => ingestEncounter(record({ ...valid, Encounter_Type: "Coffee chat" })))[0].path)
      .toBe("fields.Encounter_Type");
  });

  test("rejects an invalid uid and a non-string summary", () => {
    expect(() => ingestEncounter(record({ ...valid, Encounter_UID: "has space" }))).toThrow(HttpError);
    expect(() => ingestEncounter(record({ ...valid, Encounter_Summary: 12 }))).toThrow(HttpError);
  });

  test("a patient's Master_ID is overridden by the server", () => {
    expect(ingestEncounter(record({ ...valid, Master_ID: "OTHER" }), { masterId: "M1" }).masterId).toBe("M1");
  });

  test("keeps only the encounter fields and ignores client-supplied provenance", () => {
    const encounter = ingestEncounter(record({
      ...valid, Imaging_Region: "Chest", Event_Created_At: "2001-01-01T00:00:00Z", Event_Type: "Imaging",
    }));
    expect(Object.keys(encounter.payload.fields).sort()).toEqual(["Encounter_Date", "Encounter_UID", "Master_ID"]);
    expect(encounter.recordedAt).toBeUndefined();
  });

  test("rejects a body that is not { id, fields }", () => {
    expect(() => ingestEncounter({ nope: true })).toThrow(HttpError);
  });
});
