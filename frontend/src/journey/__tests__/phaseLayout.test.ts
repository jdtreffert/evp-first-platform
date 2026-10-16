import { describe, expect, it } from "vitest";
import type { Encounter } from "../../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { buildDiagnosisView } from "../diagnosisView";
import { GEOMETRY, layoutPhaseView } from "../phaseLayout";
import { buildTreatmentView } from "../treatmentView";

function event(
  uid: string,
  eventType: string,
  eventDate: string,
  encounterUid?: string,
  extra: Partial<UnifiedEvent> = {},
): UnifiedEvent {
  return { uid, masterId: "M1", eventType, eventDate, encounterUid, payload: { id: uid, fields: {} }, ...extra };
}

function encounter(uid: string, encounterDate: string): Encounter {
  return { uid, masterId: "M1", encounterDate, payload: { id: uid, fields: {} } };
}

function layoutOf(events: UnifiedEvent[], encounters: Encounter[] = []) {
  return layoutPhaseView(buildDiagnosisView(events, encounters)!);
}

function layoutTreatment(events: UnifiedEvent[]) {
  return layoutPhaseView(buildTreatmentView(events, [])!);
}

const placed = (layout: ReturnType<typeof layoutOf>, uid: string) =>
  layout.lanes.flatMap((lane) => lane.events).find((item) => item.view.event.uid === uid)!;

describe("layoutPhaseView: positions", () => {
  const events = [
    event("symptom", "Symptom", "2026-02-01"),
    event("scan", "Imaging", "2026-03-03"),
    event("diagnosis", "Diagnosis", "2026-04-02"),
  ];

  it("places events left to right in proportion to the days between them", () => {
    const layout = layoutOf(events);
    const x = (uid: string) => placed(layout, uid).x;

    // 30 days then 30 days: equal spacing.
    expect(x("scan") - x("symptom")).toBeCloseTo(x("diagnosis") - x("scan"), 5);
    expect(x("symptom")).toBe(GEOMETRY.paddingLeft);
    expect(x("diagnosis")).toBeCloseTo(layout.width - GEOMETRY.paddingRight, 5);
  });

  it("stacks lanes top to bottom under the axis, each as tall as its rows need", () => {
    const layout = layoutOf(events);

    expect(layout.lanes.map((lane) => lane.lane.id)).toEqual(["symptoms-experience", "investigations", "decisions-milestones"]);
    expect(layout.lanes[0].top).toBe(GEOMETRY.axisHeight);
    for (let index = 1; index < layout.lanes.length; index += 1) {
      expect(layout.lanes[index].top).toBe(layout.lanes[index - 1].top + layout.lanes[index - 1].height);
    }
    const last = layout.lanes[layout.lanes.length - 1];
    expect(layout.height).toBe(last.top + last.height);
    expect(layout.lanes[0].height).toBe(GEOMETRY.rowHeight + 2 * GEOMETRY.lanePaddingY);
  });

  it("keeps an event inside its own lane", () => {
    const layout = layoutOf(events);
    for (const lane of layout.lanes) {
      for (const item of lane.events) {
        expect(item.y).toBeGreaterThan(lane.top);
        expect(item.y).toBeLessThan(lane.top + lane.height);
      }
    }
  });

  it("handles a phase that falls on a single day", () => {
    const layout = layoutOf([event("scan", "Imaging", "2026-04-02"), event("diagnosis", "Diagnosis", "2026-04-02")]);

    expect(placed(layout, "scan").x).toBe(placed(layout, "diagnosis").x);
    expect(Number.isFinite(placed(layout, "scan").x)).toBe(true);
    expect(layout.width).toBeGreaterThanOrEqual(GEOMETRY.minPlotWidth);
  });

  it("never grows wider than the maximum for a very long phase", () => {
    const layout = layoutOf([event("symptom", "Symptom", "2000-01-01"), event("diagnosis", "Diagnosis", "2026-04-02")]);
    expect(layout.width).toBeLessThanOrEqual(GEOMETRY.maxPlotWidth + GEOMETRY.paddingLeft + GEOMETRY.paddingRight);
  });
});

describe("layoutPhaseView: overlapping events", () => {
  it("moves events of one lane that are too close onto separate rows, and lets distant ones share a row", () => {
    const layout = layoutOf([
      event("scan-a", "Imaging", "2026-03-01"),
      event("scan-b", "Imaging", "2026-03-01"),
      event("scan-c", "Imaging", "2026-03-02"),
      event("scan-far", "Imaging", "2026-06-01"),
      event("diagnosis", "Diagnosis", "2026-06-02"),
    ]);

    expect(placed(layout, "scan-a").row).toBe(0);
    expect(placed(layout, "scan-b").row).toBe(1);
    expect(placed(layout, "scan-c").row).toBe(2);
    expect(placed(layout, "scan-far").row).toBe(0);

    const investigations = layout.lanes.find((lane) => lane.lane.id === "investigations")!;
    expect(investigations.height).toBe(3 * GEOMETRY.rowHeight + 2 * GEOMETRY.lanePaddingY);
    const ys = ["scan-a", "scan-b", "scan-c"].map((uid) => placed(layout, uid).y);
    expect(new Set(ys).size).toBe(3);
  });

  it("never lets the label of one event overlap the next event on the same row", () => {
    const events = Array.from({ length: 12 }, (_, index) => event(`scan-${index}`, "Imaging", `2026-03-${String(index + 1).padStart(2, "0")}`));
    const layout = layoutOf([...events, event("diagnosis", "Diagnosis", "2026-04-02")]);
    const lane = layout.lanes.find((l) => l.lane.id === "investigations")!;

    for (const row of new Set(lane.events.map((item) => item.row))) {
      const inRow = lane.events.filter((item) => item.row === row).sort((a, b) => a.x - b.x);
      for (let index = 1; index < inRow.length; index += 1) {
        expect(inRow[index].x - GEOMETRY.markerRadius).toBeGreaterThanOrEqual(inRow[index - 1].right + GEOMETRY.labelGap);
      }
    }
  });

  it("packs events with short labels closer than events with long labels", () => {
    // A distant third event fixes the scale at 6 pixels a day, so 14 days apart is 84 pixels: enough for a
    // short label such as "EV", not for "Treatment Response".
    const delivery = (uid: string, date: string) => event(uid, "Treatment_Delivery", date, undefined, { treatmentName: "EV" });
    const shortLabels = layoutTreatment([delivery("d1", "2026-05-01"), delivery("d2", "2026-05-15"), delivery("d3", "2026-12-01")]);
    const longLabels = layoutTreatment([
      event("r1", "Treatment_Response", "2026-05-01"),
      event("r2", "Treatment_Response", "2026-05-15"),
      event("r3", "Treatment_Response", "2026-12-01"),
    ]);

    expect(shortLabels.lanes[0].events.map((item) => item.row)).toEqual([0, 0, 0]);
    expect(longLabels.lanes[0].events.map((item) => item.row)).toEqual([0, 1, 0]);
  });

  it("gives a milestone the extra room its larger marker and bold label need", () => {
    const layout = layoutOf([event("scan", "Imaging", "2026-03-01"), event("diagnosis", "Diagnosis", "2026-04-02")]);
    const diagnosis = placed(layout, "diagnosis");

    expect(diagnosis.right - diagnosis.x).toBeGreaterThan(GEOMETRY.milestoneRadius + GEOMETRY.labelOffset);
  });
});

describe("layoutPhaseView: encounter connectors", () => {
  const clinic = encounter("clinic", "2026-04-02");

  it("draws one line at the encounter's date spanning its members across lanes", () => {
    const layout = layoutOf(
      [
        event("symptom", "Symptom", "2026-04-02", "clinic"),
        event("scan", "Imaging", "2026-04-02", "clinic"),
        event("diagnosis", "Diagnosis", "2026-04-02", "clinic"),
      ],
      [clinic],
    );
    const [connector] = layout.connectors;

    expect(layout.connectors).toHaveLength(1);
    expect(connector.hasLine).toBe(true);
    expect(connector.yTop).toBe(placed(layout, "symptom").y);
    expect(connector.yBottom).toBe(placed(layout, "diagnosis").y);
    expect(connector.x).toBe(placed(layout, "scan").x);
    expect(connector.ticks).toEqual([]);
  });

  it("adds a tick to members dated differently from the encounter, which keep their own position", () => {
    const layout = layoutOf(
      [
        event("scan", "Imaging", "2026-03-20", "clinic"),
        event("diagnosis", "Diagnosis", "2026-04-02", "clinic"),
        event("other", "Lab", "2026-03-01"),
      ],
      [clinic],
    );
    const [connector] = layout.connectors;

    expect(connector.ticks).toHaveLength(1);
    expect(connector.ticks[0]).toMatchObject({ uid: "scan", x1: placed(layout, "scan").x, x2: connector.x });
    expect(placed(layout, "scan").x).toBeLessThan(connector.x);
  });

  it("does not draw a line for an encounter with one member in the phase", () => {
    const layout = layoutOf(
      [event("diagnosis", "Diagnosis", "2026-04-02", "clinic"), event("decision", "Decision", "2026-04-20", "clinic")],
      [clinic],
    );

    expect(layout.connectors[0].hasLine).toBe(false);
  });

  it("does not join events that only share a date", () => {
    const layout = layoutOf([event("scan", "Imaging", "2026-04-02"), event("diagnosis", "Diagnosis", "2026-04-02")], [clinic]);
    expect(layout.connectors).toEqual([]);
  });
});

describe("layoutPhaseView: axis", () => {
  it("labels the first of each month inside the range, at the matching position", () => {
    const layout = layoutOf([event("symptom", "Symptom", "2026-02-10"), event("diagnosis", "Diagnosis", "2026-05-20")]);

    expect(layout.ticks.map((tick) => tick.label)).toEqual(["Mar 2026", "Apr 2026", "May 2026"]);
    const xs = layout.ticks.map((tick) => tick.x);
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    expect(xs[0]).toBeGreaterThan(placed(layout, "symptom").x);
    expect(xs[2]).toBeLessThan(placed(layout, "diagnosis").x);
  });

  it("crosses a year boundary", () => {
    const layout = layoutOf([event("symptom", "Symptom", "2025-11-15"), event("diagnosis", "Diagnosis", "2026-02-15")]);
    expect(layout.ticks.map((tick) => tick.label)).toEqual(["Dec 2025", "Jan 2026", "Feb 2026"]);
  });

  it("falls back to the start date when the range contains no month start", () => {
    const layout = layoutOf([event("symptom", "Symptom", "2026-04-05"), event("diagnosis", "Diagnosis", "2026-04-20")]);
    expect(layout.ticks.map((tick) => tick.label)).toEqual(["5 Apr 2026"]);
  });
});

describe("layoutPhaseView: purity", () => {
  it("gives the same layout for the same view and does not change it", () => {
    const view = buildDiagnosisView(
      [event("scan", "Imaging", "2026-03-01", "clinic"), event("diagnosis", "Diagnosis", "2026-04-02", "clinic")],
      [encounter("clinic", "2026-04-02")],
    )!;
    const before = JSON.stringify(view);

    expect(layoutPhaseView(view)).toEqual(layoutPhaseView(view));
    expect(JSON.stringify(view)).toBe(before);
  });
});

describe("layoutPhaseView: references", () => {
  it("places a labelled line at the referenced date and keeps the layout's references empty when there are none", () => {
    const view = buildDiagnosisView([event("scan", "Imaging", "2026-03-01"), event("diagnosis", "Diagnosis", "2026-04-02")], [])!;

    expect(layoutPhaseView(view).references).toEqual([]);

    const withReference = layoutPhaseView({ ...view, references: [{ day: "2026-03-01", label: "Started" }] });
    expect(withReference.references).toEqual([{ x: GEOMETRY.paddingLeft, label: "Started", day: "2026-03-01", row: 0 }]);
    expect(withReference.axisHeight).toBe(GEOMETRY.axisHeight);
  });

  it("puts a label that would run into an earlier one on a lower row, and grows the axis only then", () => {
    const view = buildDiagnosisView([event("scan", "Imaging", "2026-03-01"), event("diagnosis", "Diagnosis", "2027-04-02")], [])!;
    const close = layoutPhaseView({ ...view, references: [{ day: "2026-03-01", label: "Treatment completed" }, { day: "2026-03-20", label: "Complete response confirmed" }] });
    const apart = layoutPhaseView({ ...view, references: [{ day: "2026-03-01", label: "Treatment completed" }, { day: "2027-01-01", label: "Complete response confirmed" }] });

    expect(close.references.map((r) => r.row)).toEqual([0, 1]);
    expect(close.axisHeight).toBe(GEOMETRY.axisHeight + GEOMETRY.referenceRowHeight);
    expect(close.lanes[0].top).toBe(close.axisHeight);
    expect(apart.references.map((r) => r.row)).toEqual([0, 0]);
    expect(apart.axisHeight).toBe(GEOMETRY.axisHeight);
  });
});
