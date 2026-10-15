import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Encounter } from "../../../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../../../backend/src/types/UnifiedEvents";
import EncounterGroupCard from "../EncounterGroupCard";

const encounter: Encounter = {
  uid: "enc-1",
  masterId: "M1",
  encounterDate: "2026-03-04",
  encounterType: "Infusion visit",
  encounterSummary: "Cycle 2",
  payload: { id: "enc-1", fields: {} },
};

function member(uid: string): UnifiedEvent {
  return { uid, masterId: "M1", eventType: "Lab", eventDate: "2026-03-04", encounterUid: "enc-1", payload: { id: uid, fields: {} } };
}

function render(overrides: Partial<Encounter> = {}, onEditEncounter?: () => void): string {
  return renderToString(
    <EncounterGroupCard group={{ encounter: { ...encounter, ...overrides }, events: [member("a"), member("b")] }} onEditEncounter={onEditEncounter}>
      <p>member cards go here</p>
    </EncounterGroupCard>,
  ).replaceAll("<!-- -->", "");
}

describe("EncounterGroupCard", () => {
  it("shows the encounter once, with its event count, above the events it is given", () => {
    const html = render();

    expect(html).toContain("2026-03-04 · Infusion visit · Cycle 2");
    expect(html).toContain("2 events");
    expect(html.indexOf("Infusion visit")).toBeLessThan(html.indexOf("member cards go here"));
  });

  it("uses the singular for one event", () => {
    const html = renderToString(
      <EncounterGroupCard group={{ encounter, events: [member("a")] }}><span /></EncounterGroupCard>,
    ).replaceAll("<!-- -->", "");
    expect(html).toContain("1 event<");
  });

  it("offers Edit encounter only when editing is allowed", () => {
    expect(render()).not.toContain("Edit encounter");
    expect(render({}, () => undefined)).toContain("Edit encounter");
  });

  it("lists the encounter's documents, with their type, only when it has some", () => {
    expect(render()).not.toContain("Encounter documents");
    expect(render({ documentAttachment: ["doc-1"], documentType: "Visit Summary" })).toContain("Encounter documents (Visit Summary):");
  });
});
