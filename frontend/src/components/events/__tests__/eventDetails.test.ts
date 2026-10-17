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

    expect(rows.filter((row) => row.label === "TNM Stage")).toEqual([{ key: "tnmStage", label: "TNM Stage", value: "T2 N2 M0" }]);
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
    expect(rows.find((row) => row.key === "tumorStage")).toMatchObject({ label: "tumor Stage", value: "Stage IIIA" });
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
      { key: "pathologyDepth", label: "pathology Depth", value: "T1" },
      { key: "pathologyVariantHistology", label: "pathology Variant Histology", value: "Nested, Micropapillary" },
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
