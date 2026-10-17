import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { UnifiedEvent } from "../../../../../backend/src/types/UnifiedEvents";
import EventForm from "../EventForm";

const noop = async () => undefined;

function render(initial?: UnifiedEvent): string {
  return renderToString(
    <EventForm masterId="M1" defaultSource="Patient" initial={initial} onSave={noop} onCancel={() => undefined} />,
  );
}

function event(extra: Partial<UnifiedEvent> = {}): UnifiedEvent {
  return {
    uid: "N1",
    masterId: "M1",
    eventType: "Note",
    eventDate: "2026-03-04",
    payload: { id: "N1", fields: { Event_UID: "N1", Event_Type: "Note", Event_Date: "2026-03-04", Event_Details: "x" } },
    ...extra,
  };
}

describe("EventForm encounter section (first render, before encounters load)", () => {
  it("offers an optional Encounter section with None and New encounter", () => {
    const html = render();

    expect(html).toContain("Encounter (optional)");
    expect(html).toContain("Healthcare encounter this event is part of");
    expect(html).toContain("None");
    expect(html).toContain("New encounter…");
    expect(html).toContain("Looking for encounters…");
  });

  it("does not show the new-encounter fields until New encounter is chosen", () => {
    expect(render()).not.toContain("Encounter summary (optional)");
  });

  it("opens the section and keeps the existing link selectable when editing a linked event", () => {
    const html = render(event({ encounterUid: "enc-9" }));

    expect(html).toMatch(/<details[^>]*open=""[^>]*>\s*<summary[^>]*>Encounter \(optional\)/);
    expect(html).toContain('value="enc-9"');
    expect(html).toContain("Linked encounter");
  });

  it("leaves the section closed when the event has no encounter", () => {
    expect(render(event())).not.toMatch(/<details[^>]*open=""[^>]*>\s*<summary[^>]*>Encounter \(optional\)/);
  });
});

describe("EventForm for a Disease_Status", () => {
  const diseaseStatus = (fields: Record<string, unknown> = {}): UnifiedEvent => ({
    uid: "DS1",
    masterId: "M1",
    eventType: "Disease_Status",
    eventDate: "2026-08-15",
    payload: { id: "DS1", fields: { Event_UID: "DS1", Event_Type: "Disease_Status", Event_Date: "2026-08-15", ...fields } },
  });
  const text = (html: string) => html.replaceAll("<!-- -->", "");

  it("offers Disease Status as an event type and, for it, the five fields with plain labels", () => {
    const html = text(render(diseaseStatus()));

    expect(html).toContain(">Disease Status</option>");
    for (const label of ["Disease status (required)", "Disease extent", "Basis for status", "Confidence", "Notes"]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain("Disease Status Category");
  });

  it("offers exactly the specified options for each choice", () => {
    const html = text(render(diseaseStatus()));

    for (const option of [
      "No evidence of disease", "Indeterminate or suspicious", "Disease present",
      "Local", "Regional", "Metastatic", "Multiple",
      "Clinician documented", "Patient recorded from clinician communication", "Documented in source record", "Patient asserted",
      "Confirmed", "Probable", "Possible", "Indeterminate",
    ]) {
      expect(html).toContain(`<option value="${option}"`);
    }
  });

  it("explains what the choices mean without giving advice", () => {
    const html = text(render(diseaseStatus()));

    expect(html).toContain("No evidence of disease does not mean cured.");
    expect(html).toContain("Indeterminate or suspicious does not mean confirmed disease.");
    expect(html).toContain("documented or communicated at the date of this assessment");
    expect(html).toContain("Keep scans, tests and results as their own events");
    expect(html).not.toMatch(/you should|we recommend|consider (surgery|treatment)/i);
  });

  it("does not preselect any status: only the empty choice is selected, and the required one asks to choose", () => {
    const html = text(render(diseaseStatus()));
    const category = html.match(/<select[^>]*required=""[^>]*>[\s\S]*?<\/select>/)?.[0] ?? "";

    expect(category).toContain('<option value="" selected="">Choose…</option>');
    // None of the Disease_Status choices is selected (the event type and source selects are, as they should be).
    const choices = ["No evidence of disease", "Indeterminate or suspicious", "Disease present", "Local", "Regional", "Metastatic", "Multiple", "Clinician documented", "Patient asserted", "Confirmed", "Probable", "Possible", "Indeterminate"];
    for (const choice of choices) expect(html).not.toContain(`<option value="${choice}" selected=""`);
  });

  it("does not call the empty extent choice Not specified, because that is a real option", () => {
    const html = text(render(diseaseStatus()));
    const extent = html.match(/<select[^>]*>(?:(?!<\/select>)[\s\S])*<option value="Metastatic"[\s\S]*?<\/select>/)?.[0] ?? "";

    expect(extent).toContain('<option value="" selected="">Leave blank</option>');
    expect(extent.match(/>Not specified</g)).toHaveLength(1);
  });

  it("shows a stored status as recorded when editing", () => {
    const html = text(render(diseaseStatus({ Disease_Status_Category: "Indeterminate or suspicious", Disease_Status_Basis: "Patient asserted" })));

    expect(html).toMatch(/<option value="Indeterminate or suspicious" selected=""/);
    expect(html).toMatch(/<option value="Patient asserted" selected=""/);
    expect(html).not.toMatch(/<option value="No evidence of disease" selected=""/);
  });

  it("does not show Disease_Status fields or its guidance for other event types", () => {
    const html = text(render(event()));

    expect(html).not.toContain("Disease extent");
    expect(html).not.toContain("Basis for status");
    expect(html).not.toContain("does not mean cured");
  });
});
