import { describe, expect, it } from "vitest";
import type { UnifiedEvent } from "../../../../../backend/src/types/UnifiedEvents";
import { detailRows } from "../eventDetails";

function event(eventType: string, eventDetails: Record<string, unknown>): UnifiedEvent {
  return { uid: "e", masterId: "M1", eventType, eventDate: "2026-04-10", eventDetails, payload: { id: "e", fields: {} } };
}

const diagnosis = (details: Record<string, unknown>) =>
  event("Diagnosis", { pathologyHistology: "Urothelial", pathologyGrade: "High", ...details });

describe("detailRows for a Diagnosis", () => {
  it("shows T, N and M together on one line labelled TNM Stage", () => {
    const rows = detailRows(diagnosis({ tumorT: "T2", tumorN: "N2", tumorM: "M0" }));

    expect(rows.filter((row) => row.label === "TNM Stage")).toEqual([{ key: "tnmStage", label: "TNM Stage", value: "T2 N2 M0", freeText: false }]);
    expect(rows.map((row) => row.key)).not.toEqual(expect.arrayContaining(["tumorT"]));
    expect(rows.map((row) => row.key)).not.toContain("tumorN");
    expect(rows.map((row) => row.key)).not.toContain("tumorM");
  });

  it("lists only the values recorded, in the order T N M, and fills nothing in", () => {
    const value = (details: Record<string, unknown>) => detailRows(diagnosis(details)).find((row) => row.key === "tnmStage")?.value;

    expect(value({ tumorT: "T2", tumorN: null, tumorM: "M0" })).toBe("T2 M0");
    expect(value({ tumorT: "T3", tumorN: "", tumorM: null })).toBe("T3");
    expect(value({ tumorN: "NX" })).toBe("NX");
    expect(value({ tumorM: "M1", tumorT: "Tis", tumorN: "N0" })).toBe("Tis N0 M1");
  });

  it("has no TNM row at all when none of the three is recorded", () => {
    expect(detailRows(diagnosis({ tumorT: null, tumorN: null, tumorM: null })).map((row) => row.key)).not.toContain("tnmStage");
    expect(detailRows(diagnosis({})).map((row) => row.key)).not.toContain("tnmStage");
  });

  it("puts the line where the first of T, N and M would be, and keeps the other details and their order", () => {
    const rows = detailRows(
      diagnosis({ diagnosisInitialPresentation: "Hematuria", tumorT: "T2", tumorN: "N2", tumorM: "M0", tumorStage: "Stage IIIA" }),
    );

    expect(rows.map((row) => row.key)).toEqual([
      "pathologyHistology",
      "pathologyGrade",
      "diagnosisInitialPresentation",
      "tnmStage",
      "tumorStage",
    ]);
    expect(rows.find((row) => row.key === "tumorStage")).toMatchObject({ label: "Tumor Stage", value: "Stage IIIA" });
  });

  it("shows the line once, even when only a later one of the three is recorded", () => {
    const rows = detailRows(diagnosis({ tumorM: "M0" }));
    expect(rows.filter((row) => row.key === "tnmStage")).toHaveLength(1);
  });

  it("does not change the event it is given", () => {
    const given = diagnosis({ tumorT: "T2", tumorN: "N2", tumorM: "M0" });
    const before = JSON.stringify(given);
    detailRows(given);
    expect(JSON.stringify(given)).toBe(before);
    expect(given.eventDetails).toMatchObject({ tumorT: "T2", tumorN: "N2", tumorM: "M0" });
  });
});

describe("detailRows for other events", () => {
  it("is unchanged: each recorded value on its own row, with the same labels, and arrays joined", () => {
    const rows = detailRows(event("Pathology", { pathologyDepth: "T1", pathologyVariantHistology: ["Nested", "Micropapillary"], pathologyNotes: null, pathologyLVI: "" }));

    expect(rows).toEqual([
      { key: "pathologyDepth", label: "Pathology Depth", value: "T1", freeText: false },
      { key: "pathologyVariantHistology", label: "Pathology Variant Histology", value: "Nested, Micropapillary", freeText: false },
    ]);
  });

  it("does not combine T, N and M on an event that is not a Diagnosis", () => {
    const rows = detailRows(event("Note", { tumorT: "T2", tumorN: "N2", tumorM: "M0" }));
    expect(rows.map((row) => row.key)).toEqual(["tumorT", "tumorN", "tumorM"]);
  });

  it("has no rows when there are no details", () => {
    expect(detailRows({ uid: "e", masterId: "M1", eventType: "Note", eventDate: null, payload: { id: "e", fields: {} } })).toEqual([]);
  });
});

describe("detailRows: one line per value, units beside their value, free text underneath", () => {
  const rows = (eventType: string, details: Record<string, unknown>) => detailRows(event(eventType, details));
  const byKey = (list: ReturnType<typeof detailRows>, key: string) => list.find((row) => row.key === key);

  it("shows an ordinary value as one line, not free text", () => {
    expect(byKey(rows("Treatment_Delivery", { treatmentRoute: "Intravenous" }), "treatmentRoute")).toEqual({
      key: "treatmentRoute",
      label: "Treatment Route",
      value: "Intravenous",
      freeText: false,
    });
  });

  it("puts a value and its units on one line, and drops the separate units row", () => {
    const list = rows("Treatment_Delivery", { treatmentName: "EV", treatmentCycle: 2, treatmentDose: 108, treatmentDoseUnits: "mg", treatmentDeliveryStatus: "Given" });

    expect(byKey(list, "treatmentDose")).toMatchObject({ label: "Treatment Dose", value: "108 mg", freeText: false });
    expect(list.map((row) => row.key)).toEqual(["treatmentName", "treatmentCycle", "treatmentDose", "treatmentDeliveryStatus"]);
  });

  it.each([
    ["Symptom", { symptomDuration: 3, symptomDurationUnits: "days" }, "symptomDuration", "3 days"],
    ["ctDNA", { ctDNAValue: 0, ctDNAUnits: "copies/mL" }, "ctDNAValue", "0 copies/mL"],
    ["utDNA", { utDNAValue: 12.5, utDNAUnits: "ng/mL" }, "utDNAValue", "12.5 ng/mL"],
  ])("finds the units of a %s value by name", (type, details, key, shown) => {
    const list = rows(type, details);
    expect(byKey(list, key)?.value).toBe(shown);
    expect(list).toHaveLength(1);
  });

  it("keeps a zero value, and shows a value with no units as it is", () => {
    expect(byKey(rows("Treatment_Delivery", { treatmentDose: 0 }), "treatmentDose")?.value).toBe("0");
    expect(byKey(rows("Treatment_Delivery", { treatmentDose: 108, treatmentDoseUnits: null }), "treatmentDose")?.value).toBe("108");
  });

  it("never hides units that have no value: they stay as their own row", () => {
    const list = rows("Treatment_Delivery", { treatmentDose: null, treatmentDoseUnits: "mg" });
    expect(list).toEqual([{ key: "treatmentDoseUnits", label: "Treatment Dose Units", value: "mg", freeText: false }]);
  });

  it("shows notes and other free text under the label", () => {
    const list = rows("Recurrence", {
      recurrenceLocation: "Bladder",
      recurrenceNotes: "Seen on follow-up.",
      biopsyNotes: "Short",
      treatmentChangeReason: "Held for a rash",
      imagingResult: "Stable",
    });

    expect(list.map((row) => [row.key, row.freeText])).toEqual([
      ["recurrenceLocation", false],
      ["recurrenceNotes", true],
      ["biopsyNotes", true],
      ["treatmentChangeReason", true],
      ["imagingResult", true],
    ]);
  });

  it("treats a multi-line or very long value as free text even when its field is not known to be", () => {
    expect(byKey(rows("Lab", { labValues: "Creatinine: 1.1\nHemoglobin: 13.2" }), "labValues")?.freeText).toBe(true);
    expect(byKey(rows("Lab", { somethingElse: "x".repeat(81) }), "somethingElse")?.freeText).toBe(true);
    expect(byKey(rows("Lab", { somethingElse: "x".repeat(80) }), "somethingElse")?.freeText).toBe(false);
  });

  it("keeps the text of free text exactly as recorded", () => {
    const text = "Line one\nLine two";
    expect(byKey(rows("Note", { noteText: text, eventNotes: text }), "eventNotes")?.value).toBe(text);
  });

  it("works with the Diagnosis TNM row: it is one line, and free text stays underneath", () => {
    const list = detailRows(
      diagnosis({ tumorT: "T2", tumorN: "N2", tumorM: "M0", pathologyNotes: "Muscle invasive.", diagnosisInitialPresentation: "Hematuria" }),
    );

    expect(byKey(list, "tnmStage")?.freeText).toBe(false);
    expect(byKey(list, "pathologyNotes")?.freeText).toBe(true);
    expect(byKey(list, "pathologyHistology")?.freeText).toBe(false);
  });
});

describe("detailRows: labels", () => {
  it.each([
    ["tumorStage", "Tumor Stage"],
    ["ctDNAVendor", "ctDNA Vendor"],
    ["utDNAValue", "utDNA Value"],
    ["pathologyLVI", "Pathology LVI"],
    ["somaticPDL1CPS", "Somatic PDL1 CPS"],
    ["treatmentDeliveryNotes", "Treatment Delivery Notes"],
    ["recurrence", "Recurrence"],
  ])("writes the key %s as %j", (key, label) => {
    expect(detailRows(event("Note", { [key]: "x" }))[0].label).toBe(label);
  });
});
