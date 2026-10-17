import { describe, expect, it } from "vitest";
import type { Encounter } from "../../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { buildDiagnosisView } from "../diagnosisView";
import { GEOMETRY, layoutPhaseView, timelineFitWidth } from "../phaseLayout";
import { buildSummaryView } from "../summaryView";
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

describe("layoutPhaseView: spans", () => {
  const base = () => buildDiagnosisView([event("scan", "Imaging", "2026-03-01"), event("diagnosis", "Diagnosis", "2026-09-02")], [])!;

  it("adds no band when there are no spans, so existing views are unchanged", () => {
    const layout = layoutPhaseView(base());

    expect(layout.spans).toEqual([]);
    expect(layout.spanBandHeight).toBe(0);
    expect(layout.axisHeight).toBe(GEOMETRY.axisHeight);
  });

  it("draws an arrow from its start date to its end date, one row each, above the axis, pushing the lanes down", () => {
    const view = base();
    const layout = layoutPhaseView({
      ...view,
      spans: [
        { id: "a", fromDay: "2026-03-01", toDay: "2026-09-02", label: "Time since A" },
        { id: "b", fromDay: "2026-06-01", toDay: "2026-09-02", label: "Time since B" },
      ],
    });

    expect(layout.spanBandHeight).toBe(2 * GEOMETRY.spanRowHeight);
    expect(layout.axisHeight).toBe(layout.spanBandHeight + GEOMETRY.axisHeight);
    expect(layout.lanes[0].top).toBe(layout.axisHeight);
    expect(layout.spans.map((s) => [s.id, s.x1 < s.x2, s.y])).toEqual([["a", true, 20], ["b", true, 20 + GEOMETRY.spanRowHeight]]);
    expect(layout.spans[0].x1).toBe(GEOMETRY.paddingLeft);
  });

  it("starts the label at the arrow's start when it fits before the head, and pulls it left when it does not", () => {
    const view = base();
    const layout = layoutPhaseView({
      ...view,
      spans: [
        { id: "long", fromDay: "2026-03-01", toDay: "2026-09-02", label: "Time since A" },
        { id: "short", fromDay: "2026-09-01", toDay: "2026-09-02", label: "Time since a recent milestone, measured" },
      ],
    });
    const [long, short] = layout.spans;

    expect(long.labelX).toBe(long.x1 + 8);
    expect(short.labelX).toBeLessThan(short.x1);
    expect(short.labelX + short.label.length * GEOMETRY.charWidth).toBeLessThanOrEqual(short.x2);
    expect(short.labelX).toBeGreaterThanOrEqual(4);
  });
});

describe("layoutPhaseView: fitting into a width", () => {
  const status = (uid: string, eventDate: string, category: string): UnifiedEvent => event(uid, "Disease_Status", eventDate, undefined, { diseaseStatusCategory: category });
  const completed = (uid: string, eventDate: string): UnifiedEvent => event(uid, "Treatment_Change", eventDate, undefined, { treatmentChangeType: "Treatment completed" });

  // A long journey whose milestones are close together near the end.
  const journey: UnifiedEvent[] = [
    event("diagnosis", "Diagnosis", "2026-04-10"),
    event("start", "Treatment_Start", "2026-05-01"),
    event("change", "Treatment_Change", "2026-06-15"),
    completed("done", "2026-08-01"),
    event("cr", "Decision", "2026-08-02", undefined, { decisionType: "Complete response confirmed" }),
    status("ned", "2026-09-01", "No evidence of disease"),
    status("sus", "2026-10-01", "Indeterminate or suspicious"),
    event("recurrence", "Recurrence", "2026-10-08"),
    status("present", "2026-10-12", "Disease present"),
  ];
  const summary = (events = journey, today = "2026-10-17") => buildSummaryView(events, [], { today });

  /** True when two labels on the same row of a lane would overlap. */
  function overlaps(layout: ReturnType<typeof layoutPhaseView>): string[] {
    const found: string[] = [];
    for (const { events } of layout.lanes) {
      const byRow = new Map<number, typeof events>();
      for (const item of events) byRow.set(item.row, [...(byRow.get(item.row) ?? []), item]);
      for (const row of byRow.values()) {
        const ordered = [...row].sort((a, b) => a.x - b.x);
        for (let index = 1; index < ordered.length; index += 1) {
          const radius = ordered[index].view.presentation.milestone ? GEOMETRY.milestoneRadius : GEOMETRY.markerRadius;
          if (ordered[index].x - radius < ordered[index - 1].right) found.push(`${ordered[index - 1].view.event.uid}/${ordered[index].view.event.uid}`);
        }
      }
    }
    return found;
  }

  it("does not fit without the option, so the Summary would scroll", () => {
    expect(layoutPhaseView(summary()).width).toBeGreaterThan(1000);
  });

  it.each([1100, 900, 760, 600])("fits the whole drawing, including the last label and Today, into %i pixels", (fitWidth) => {
    const layout = layoutPhaseView(summary(), { fitWidth });

    expect(layout.width).toBeLessThanOrEqual(fitWidth);
    const rights = layout.lanes.flatMap((lane) => lane.events.map((item) => item.right));
    expect(Math.max(...rights)).toBeLessThanOrEqual(layout.width);
    expect(layout.references[0].x).toBeLessThan(layout.width);
  });

  it.each([1100, 900, 760, 600, 480])("never overlaps two labels on one row of a lane, at %i pixels", (fitWidth) => {
    expect(overlaps(layoutPhaseView(summary(), { fitWidth }))).toEqual([]);
  });

  it("moves labels that would collide onto separate rows instead of overlapping, so close milestones get taller lanes", () => {
    const wide = layoutPhaseView(summary(), { fitWidth: 1500 });
    const narrow = layoutPhaseView(summary(), { fitWidth: 600 });
    const rows = (layout: typeof wide) => Math.max(...layout.lanes.flatMap((lane) => lane.events.map((item) => item.row)));

    expect(rows(narrow)).toBeGreaterThan(rows(wide));
    expect(narrow.height).toBeGreaterThan(wide.height);
  });

  it("keeps the order and the proportions of the dates, only squeezed", () => {
    const natural = layoutPhaseView(summary());
    const fitted = layoutPhaseView(summary(), { fitWidth: 800 });
    const xs = (layout: typeof natural) => Object.fromEntries(layout.lanes.flatMap((lane) => lane.events.map((item) => [item.view.event.uid, item.x])));
    const n = xs(natural);
    const f = xs(fitted);

    expect(Object.keys(f).sort((a, b) => f[a] - f[b] || a.localeCompare(b))).toEqual(Object.keys(n).sort((a, b) => n[a] - n[b] || a.localeCompare(b)));
    const scale = (f.recurrence - f.diagnosis) / (n.recurrence - n.diagnosis);
    expect((f.ned - f.diagnosis) / (n.ned - n.diagnosis)).toBeCloseTo(scale, 5);
  });

  it("ends every arrow at the Today line, inside the width", () => {
    const layout = layoutPhaseView(summary(), { fitWidth: 800 });

    for (const arrow of layout.spans) {
      expect(arrow.x2).toBe(layout.references[0].x);
      expect(arrow.labelX).toBeGreaterThanOrEqual(4);
    }
    expect(layout.width).toBeLessThanOrEqual(800);
  });

  it("does not stretch a short journey beyond the usual scale, however much room there is", () => {
    const short = summary([event("diagnosis", "Diagnosis", "2026-10-01"), status("ned", "2026-10-10", "No evidence of disease")]);
    const natural = layoutPhaseView(short);
    const roomy = layoutPhaseView(short, { fitWidth: 5000 });

    expect(roomy.references[0].x).toBe(natural.references[0].x);
    expect(roomy.lanes[0].events.map((item) => item.x)).toEqual(natural.lanes[0].events.map((item) => item.x));
  });

  it("does not squeeze below the least scale, scrolling instead when there is hardly any room", () => {
    const layout = layoutPhaseView(summary(), { fitWidth: 100 });

    expect(layout.references[0].x - GEOMETRY.paddingLeft).toBeGreaterThanOrEqual(GEOMETRY.minFitPlotWidth - 1);
    expect(overlaps(layout)).toEqual([]);
  });

  it("works for an empty journey", () => {
    const layout = layoutPhaseView(summary([]), { fitWidth: 800 });
    expect(layout.width).toBeLessThanOrEqual(800);
    expect(layout.lanes).toEqual([]);
  });

  it("leaves a view laid out without the option exactly as before", () => {
    const view = buildDiagnosisView([event("scan", "Imaging", "2026-03-01"), event("diagnosis", "Diagnosis", "2026-04-02")], [])!;
    expect(layoutPhaseView(view, {})).toEqual(layoutPhaseView(view));
  });

  it("works out what is left for the drawing from the width of the whole timeline", () => {
    expect(timelineFitWidth(1000)).toBe(1000 - GEOMETRY.labelColumnWidth - GEOMETRY.chromeWidth);
    expect(timelineFitWidth(50)).toBe(0);
  });
});
