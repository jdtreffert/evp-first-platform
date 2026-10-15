import { describe, expect, it } from "vitest";
import type { Encounter } from "../../../../../backend/src/types/Encounter";
import {
  NEW_ENCOUNTER,
  buildEncounterRecord,
  encounterDay,
  encounterLabel,
  splitEncountersByDate,
} from "../encounterOptions";

function encounter(uid: string, encounterDate: string, extra: Partial<Encounter> = {}): Encounter {
  return { uid, masterId: "M1", encounterDate, payload: { id: uid, fields: {} }, ...extra };
}

describe("encounterLabel", () => {
  it("shows the date, type and summary", () => {
    const e = encounter("e1", "2026-03-04", { encounterType: "Infusion visit", encounterSummary: "Cycle 2" });
    expect(encounterLabel(e)).toBe("2026-03-04 · Infusion visit · Cycle 2");
  });

  it("falls back to a generic name when no type or summary was recorded", () => {
    expect(encounterLabel(encounter("e1", "2026-03-04"))).toBe("2026-03-04 · Encounter");
    expect(encounterLabel(encounter("e1", "2026-03-04", { encounterType: null, encounterSummary: "" }))).toBe(
      "2026-03-04 · Encounter",
    );
  });

  it("uses only the calendar date of a date-time", () => {
    expect(encounterDay(encounter("e1", "2026-03-04T09:30:00-05:00"))).toBe("2026-03-04");
  });
});

describe("splitEncountersByDate", () => {
  const encounters = [
    encounter("c", "2026-03-10"),
    encounter("b", "2026-03-04T09:00:00Z"),
    encounter("a", "2026-03-04"),
    encounter("d", "2026-01-01"),
  ];

  it("separates encounters on the date from the rest, keeping their order", () => {
    const { sameDate, other } = splitEncountersByDate(encounters, "2026-03-04");
    expect(sameDate.map((e) => e.uid)).toEqual(["b", "a"]);
    expect(other.map((e) => e.uid)).toEqual(["c", "d"]);
  });

  it("matches nothing when there is no date or no encounter on it", () => {
    expect(splitEncountersByDate(encounters, "").sameDate).toEqual([]);
    expect(splitEncountersByDate(encounters, "2030-01-01").sameDate).toEqual([]);
    expect(splitEncountersByDate([], "2026-03-04")).toEqual({ sameDate: [], other: [] });
  });
});

describe("buildEncounterRecord", () => {
  it("builds the record with only the required fields when nothing else was entered", () => {
    expect(buildEncounterRecord("enc-1", "M1", { type: "", date: "2026-03-04", summary: "  " })).toEqual({
      id: "enc-1",
      fields: { Encounter_UID: "enc-1", Master_ID: "M1", Encounter_Date: "2026-03-04" },
    });
  });

  it("includes the type and a trimmed summary", () => {
    const record = buildEncounterRecord("enc-1", "M1", { type: "Infusion visit", date: "2026-03-04", summary: " Cycle 2 " });
    expect(record.fields).toMatchObject({ Encounter_Type: "Infusion visit", Encounter_Summary: "Cycle 2" });
  });

  it("includes the attached documents, their type and redaction status when given", () => {
    const record = buildEncounterRecord("enc-1", "M1", {
      type: "", date: "2026-03-04", summary: "", documentIds: ["doc-1", "doc-2"], documentType: "Visit Summary", redactionStatus: "Contains PHI",
    });
    expect(record.fields).toMatchObject({
      Document_Attachment: ["doc-1", "doc-2"], Document_Type: "Visit Summary", Document_Redaction_Status: "Contains PHI",
    });
  });

  it("leaves out empty document values, so removing every document clears them", () => {
    const record = buildEncounterRecord("enc-1", "M1", {
      type: "", date: "2026-03-04", summary: "", documentIds: [], documentType: "", redactionStatus: "",
    });
    expect(Object.keys(record.fields).sort()).toEqual(["Encounter_Date", "Encounter_UID", "Master_ID"]);
  });
});

describe("NEW_ENCOUNTER", () => {
  it("can never equal a real Encounter_UID, which must start with a letter or digit", () => {
    expect(NEW_ENCOUNTER).toMatch(/^[^A-Za-z0-9]/);
  });
});
