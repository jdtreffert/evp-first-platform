import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Encounter } from "../../../../../backend/src/types/Encounter";
import EncounterForm from "../EncounterForm";

const noop = async () => undefined;

function render(initial?: Encounter): string {
  // Server rendering separates adjacent text pieces with comment markers; remove them to read the text.
  return renderToString(<EncounterForm masterId="M1" initial={initial} onChanged={noop} onClose={() => undefined} />)
    .replaceAll("<!-- -->", "");
}

const encounter: Encounter = {
  uid: "enc-1",
  masterId: "M1",
  encounterDate: "2026-03-04T09:30:00-05:00",
  encounterType: "Infusion visit",
  encounterSummary: "Cycle 2",
  payload: { id: "enc-1", fields: {} },
};

describe("EncounterForm (first render, before events load)", () => {
  it("opens empty for a new encounter, with every Encounter_Type option", () => {
    const html = render();

    expect(html).toContain("New encounter");
    expect(html).toContain("Not specified");
    for (const option of ["Clinic visit", "Infusion visit", "Imaging visit", "Hospital stay", "Unknown"]) {
      expect(html).toContain(option);
    }
    expect(html).toContain("Events in this encounter");
    expect(html).toContain("Also show unlinked events within 14 days");
    expect(html).toContain("Looking for events…");
    expect(html).toContain("0 to link, 0 to remove");
  });

  it("starts from the stored values when editing, showing only the date of a date-time", () => {
    const html = render(encounter);

    expect(html).toContain("Edit encounter");
    expect(html).toContain('value="2026-03-04"');
    expect(html).toContain('value="Cycle 2"');
    expect(html).toMatch(/<option value="Infusion visit" selected/);
    expect(html).toContain("Save changes");
  });

  it("says nothing is linked unless the user ticks it", () => {
    expect(render()).toContain("Nothing is linked unless you tick it");
  });

  it("offers documents for the encounter: existing, new, type and redaction status", () => {
    const html = render();

    expect(html).toContain("Documents for this encounter (optional)");
    expect(html).toContain("Attach an existing document");
    expect(html).toContain("Attach a new file");
    expect(html).toContain("Visit Summary");
    expect(html).toContain("Contains PHI");
    expect(html).toContain("Documents attached to individual events stay with those events.");
  });

  it("lists an encounter's attached documents with a way to remove them from the encounter", () => {
    const html = render({ ...encounter, documentAttachment: ["doc-1"], documentType: "Visit Summary" });

    expect(html).toContain("Remove from encounter");
    expect(html).toMatch(/<option value="Visit Summary" selected/);
  });
});
