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
