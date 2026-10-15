import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Encounter } from "../../../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../../../backend/src/types/UnifiedEvents";
import { layoutPhaseView } from "../../../journey/phaseLayout";
import { buildDiagnosisView } from "../../../journey/diagnosisView";
import PhaseTimeline from "../PhaseTimeline";
import type { PhaseSelection } from "../PhaseTimeline";

function event(uid: string, eventType: string, eventDate: string, encounterUid?: string): UnifiedEvent {
  return { uid, masterId: "M1", eventType, eventDate, encounterUid, payload: { id: uid, fields: {} } };
}

const clinic: Encounter = {
  uid: "clinic", masterId: "M1", encounterDate: "2026-04-10", encounterType: "Clinic visit", payload: { id: "clinic", fields: {} },
};

const events = [
  event("symptom", "Symptom", "2026-02-01"),
  event("scan", "Imaging", "2026-04-05", "clinic"),
  event("diagnosis", "Diagnosis", "2026-04-10", "clinic"),
  event("unknown", "Some_New_Type", "2026-04-01"),
];

function render(selection: PhaseSelection = null): string {
  const layout = layoutPhaseView(buildDiagnosisView(events, [clinic])!);
  return renderToString(
    <PhaseTimeline layout={layout} label="Diagnosis timeline" selection={selection} onSelectEvent={() => undefined} onSelectEncounter={() => undefined} />,
  );
}

describe("PhaseTimeline", () => {
  it("shows a label for each lane that has events, including Other, and no other lanes", () => {
    const html = render();

    for (const label of ["Symptoms &amp; Experience", "Investigations", "Decisions &amp; Milestones", "Other"]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain("Procedures");
  });

  it("draws every event as a labelled button, and the Diagnosis as the only diamond", () => {
    const html = render();

    expect(html).toContain('aria-label="Symptom · 2026-02-01"');
    expect(html).toContain('aria-label="Diagnosis · 2026-04-10"');
    expect(html.match(/role="button"/g)?.length).toBe(events.length + 1); // events plus the encounter
    expect(html.match(/<polygon/g)?.length).toBe(1);
  });

  it("offers the encounter line as a button with its date and type", () => {
    expect(render()).toContain('aria-label="Encounter 2026-04-10 · Clinic visit"');
  });

  it("rings the selected event, or the members of the selected encounter", () => {
    const ring = /<circle r="\d+" fill="none" stroke="#ffffff"/g;

    expect(render().match(ring)).toBeNull();
    expect(render({ kind: "event", uid: "symptom" }).match(ring)).toHaveLength(1);
    expect(render({ kind: "encounter", uid: "clinic" }).match(ring)).toHaveLength(2);
  });

  it("labels the date axis", () => {
    expect(render()).toContain("Mar 2026");
  });
});
