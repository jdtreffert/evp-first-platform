import { describe, expect, it } from "vitest";
import { eventFieldCatalog } from "../../../../backend/src/schemas/eventFieldCatalog";
import { TREATMENT_LABELS, treatmentFullName, treatmentShortName } from "../treatmentLabels";

describe("treatment labels", () => {
  it("has an explicit entry for every Treatment_Name option, so a new option needs a decision", () => {
    const options = eventFieldCatalog.Treatment_Name.options ?? [];

    // Adding an option to the Excel schema fails here until it is given a short label (or an empty entry).
    expect(options.filter((option) => !Object.prototype.hasOwnProperty.call(TREATMENT_LABELS, option))).toEqual([]);
    expect(Object.keys(TREATMENT_LABELS).filter((name) => !options.includes(name))).toEqual([]);
  });

  it("abbreviates the long names and leaves already-short names alone", () => {
    expect(treatmentShortName("Pembrolizumab")).toBe("pembro");
    expect(treatmentShortName("Nivolumab")).toBe("nivo");
    expect(treatmentShortName("Mitomycin C")).toBe("MMC");
    expect(treatmentShortName("Radiation therapy")).toBe("RT");
    for (const name of ["EV", "EVP", "BCG", "Gem/Cis", "IMRT", "SBRT"]) expect(treatmentShortName(name)).toBe(name);
  });

  it("keeps the full text of options whose short wording is not decided yet", () => {
    expect(treatmentShortName("Gemcitabine intravesical")).toBe("Gemcitabine intravesical");
    expect(treatmentShortName("Docetaxel intravesical")).toBe("Docetaxel intravesical");
  });

  it("returns an unrecorded or unknown name as it is, or null when there is none", () => {
    expect(treatmentShortName(null)).toBeNull();
    expect(treatmentShortName(undefined)).toBeNull();
    expect(treatmentShortName("")).toBeNull();
    expect(treatmentShortName("Some New Drug")).toBe("Some New Drug");
    expect(treatmentShortName("constructor")).toBe("constructor");
  });

  it("gives the full name only where the label is an abbreviation of it", () => {
    expect(treatmentFullName("EV")).toBe("Enfortumab vedotin");
    expect(treatmentFullName("EVP")).toBe("Enfortumab vedotin + pembrolizumab");
    expect(treatmentFullName("Pembrolizumab")).toBe("Pembrolizumab");
    expect(treatmentFullName("Proton therapy")).toBeNull();
    expect(treatmentFullName("Some New Drug")).toBeNull();
    expect(treatmentFullName(null)).toBeNull();
  });
});
