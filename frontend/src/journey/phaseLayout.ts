import type { EncounterConnector, PhaseLanes, ViewEvent, ViewLane } from "./phaseView";

/** Geometry of a phase view, in pixels. It lays out what the view model already decided. */
export const GEOMETRY = {
  /** Height of the date axis above the first lane. */
  axisHeight: 44,
  /** Extra axis height for each additional row of reference labels, which stack only when they would overlap. */
  referenceRowHeight: 16,
  /** Height of the band above the axis for each period arrow. */
  spanRowHeight: 28,
  /** Space before the first date. */
  paddingLeft: 48,
  /** Space after the last date, enough for the label of an event on it. */
  paddingRight: 150,
  rowHeight: 40,
  lanePaddingY: 12,
  /** Marker radii and the gap between a marker and its label; these match what the timeline draws. */
  markerRadius: 7,
  milestoneRadius: 12,
  labelOffset: 6,
  /** The estimated width of one label character at the label's font size, and the space kept after a label. */
  charWidth: 6.8,
  boldFactor: 1.08,
  labelGap: 12,
  pxPerDay: 6,
  minPlotWidth: 640,
  maxPlotWidth: 6000,
  /** The width of the lane-label column beside the drawing, and its borders, so a caller can work out what is left. */
  labelColumnWidth: 168,
  chromeWidth: 3,
  /** The least the date scale is squeezed to when fitting a drawing into a width; narrower than this it scrolls. */
  minFitPlotWidth: 320,
  /** Space kept after the last label when fitting into a width. */
  fitRightPadding: 16,
} as const;

/** What is left for the drawing when the whole timeline, label column included, is `containerWidth` wide. */
export function timelineFitWidth(containerWidth: number): number {
  return Math.max(0, Math.floor(containerWidth - GEOMETRY.labelColumnWidth - GEOMETRY.chromeWidth));
}

export interface LayoutOptions {
  /**
   * Squeeze the date scale so the whole drawing, including the last label, fits in this many pixels, so the
   * timeline does not scroll. Labels that would then collide in a lane move to separate rows rather than overlap.
   * The scale is never stretched beyond its usual size, and never squeezed below `minFitPlotWidth`.
   */
  fitWidth?: number;
}

export interface PlacedEvent {
  view: ViewEvent;
  x: number;
  y: number;
  /** Where the marker's label is expected to end. Events on one row never overlap before this point. */
  right: number;
  /** Which row of its lane the event sits on, 0 being the top. */
  row: number;
}

export interface PlacedLane {
  lane: ViewLane["lane"];
  top: number;
  height: number;
  events: PlacedEvent[];
}

export interface PlacedConnector {
  connector: EncounterConnector;
  /** The x position of the encounter's own date. */
  x: number;
  /** The vertical extent of its members. */
  yTop: number;
  yBottom: number;
  /** False for an encounter with a single member in the phase, where there is nothing to join. */
  hasLine: boolean;
  /** Short horizontal links to members dated differently from the encounter. */
  ticks: { x1: number; x2: number; y: number; uid: string }[];
}

export interface AxisTick {
  x: number;
  label: string;
}

export interface PlacedReference {
  x: number;
  label: string;
  day: string;
  /** Which row of reference labels it is on, 0 being the top; a label that would overlap an earlier one moves down. */
  row: number;
}

export interface PlacedSpan {
  id: string;
  label: string;
  /** The arrow runs from `x1` to `x2` at `y`, with its head at `x2`. */
  x1: number;
  x2: number;
  y: number;
  /** Where the label starts: at the arrow's start when it fits before the head, otherwise pushed left to end before it. */
  labelX: number;
  fromDay: string;
  toDay: string;
}

export interface PhaseLayout {
  width: number;
  height: number;
  /** The height of the whole band above the first lane: any period arrows, then the date axis. */
  axisHeight: number;
  /** The height of the period arrows at the top of that band; the date axis and reference labels sit below it. */
  spanBandHeight: number;
  /** Arrows for periods such as the time since a milestone, in the order given. */
  spans: PlacedSpan[];
  lanes: PlacedLane[];
  connectors: PlacedConnector[];
  ticks: AxisTick[];
  /** Labelled lines marking dates such as where the phase begins. */
  references: PlacedReference[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayNumber(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return Date.UTC(year, month - 1, date) / 86_400_000;
}

function monthStarts(startDay: string, endDay: string): { day: string; label: string }[] {
  const [startYear, startMonth] = startDay.split("-").map(Number);
  const starts: { day: string; label: string }[] = [];
  for (let index = startYear * 12 + startMonth - 1; ; index += 1) {
    const year = Math.floor(index / 12);
    const month = index % 12;
    const day = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    if (day > endDay) break;
    if (day >= startDay) starts.push({ day, label: `${MONTHS[month]} ${year}` });
  }
  return starts;
}

/** The estimated horizontal extent of a marker and its label, to the right of the marker's centre. */
function extentRight(view: ViewEvent): number {
  const { markerRadius, milestoneRadius, labelOffset, charWidth, boldFactor } = GEOMETRY;
  const milestone = view.presentation.milestone;
  const radius = milestone ? milestoneRadius : markerRadius;
  return radius + labelOffset + view.label.length * charWidth * (milestone ? boldFactor : 1);
}

/**
 * Turns a phase view into positions: dates become x positions in proportion to the days between them,
 * lanes stack top to bottom, events whose labels would overlap in a lane move to separate rows (so short
 * labels pack closer than long ones), and each encounter gets the line that joins its members. Events are
 * placed by their own date; an encounter's line sits at the encounter's date, with a tick to any member dated
 * differently. It only measures; it changes nothing in the view.
 */
export function layoutPhaseView(view: PhaseLanes, options: LayoutOptions = {}): PhaseLayout {
  const { paddingLeft, pxPerDay, minPlotWidth, maxPlotWidth, minFitPlotWidth, fitRightPadding } = GEOMETRY;
  const span = Math.max(0, dayNumber(view.range.end) - dayNumber(view.range.start));
  const naturalPlotWidth = Math.min(maxPlotWidth, Math.max(minPlotWidth, span * pxPerDay));
  if (options.fitWidth === undefined) return layoutAt(view, naturalPlotWidth, GEOMETRY.paddingRight);

  // Squeeze until the drawing, with its widest label, fits. Each pass removes what still overflows, plus a pixel
  // so the result is within the width rather than converging to it from above.
  let plotWidth = Math.max(minFitPlotWidth, Math.min(naturalPlotWidth, options.fitWidth - paddingLeft - fitRightPadding));
  let layout = layoutAt(view, plotWidth, fitRightPadding);
  for (let pass = 0; pass < 8 && layout.width > options.fitWidth && plotWidth > minFitPlotWidth; pass += 1) {
    plotWidth = Math.max(minFitPlotWidth, plotWidth - (layout.width - options.fitWidth) - 1);
    layout = layoutAt(view, plotWidth, fitRightPadding);
  }
  return layout;
}

function layoutAt(view: PhaseLanes, plotWidth: number, rightPadding: number): PhaseLayout {
  const { paddingLeft, rowHeight, lanePaddingY, labelGap, labelOffset, charWidth, boldFactor, referenceRowHeight, markerRadius, milestoneRadius } = GEOMETRY;

  const startNumber = dayNumber(view.range.start);
  const span = Math.max(0, dayNumber(view.range.end) - startNumber);
  const xFor = (day: string): number =>
    paddingLeft + (span === 0 ? plotWidth / 2 : ((dayNumber(day) - startNumber) / span) * plotWidth);

  // Reference labels start at their line; one that would run into an earlier label goes on a lower row.
  const referenceRowEnds: number[] = [];
  const references: PlacedReference[] = [...(view.references ?? [])]
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
    .map((reference) => {
      const x = xFor(reference.day);
      let row = referenceRowEnds.findIndex((end) => x >= end + labelGap);
      if (row === -1) row = referenceRowEnds.length;
      referenceRowEnds[row] = x + labelOffset + reference.label.length * charWidth * boldFactor;
      return { x, label: reference.label, day: reference.day, row };
    });
  const spanBandHeight = (view.spans ?? []).length * GEOMETRY.spanRowHeight;
  const axisHeight = spanBandHeight + GEOMETRY.axisHeight + Math.max(0, referenceRowEnds.length - 1) * referenceRowHeight;
  const spans: PlacedSpan[] = (view.spans ?? []).map((period, index) => {
    const x1 = xFor(period.fromDay);
    const x2 = xFor(period.toDay);
    const textWidth = period.label.length * charWidth;
    return {
      id: period.id,
      label: period.label,
      x1,
      x2,
      y: index * GEOMETRY.spanRowHeight + 20,
      labelX: Math.max(4, Math.min(x1 + 8, x2 - 10 - textWidth)),
      fromDay: period.fromDay,
      toDay: period.toDay,
    };
  });

  const placedByUid = new Map<string, PlacedEvent>();
  const lanes: PlacedLane[] = [];
  let top = axisHeight;
  for (const { lane, events } of view.lanes) {
    // For each row, where the previous event's label ends; a new event fits when its marker starts after that.
    const rowEnds: number[] = [];
    const placed: PlacedEvent[] = [];
    for (const viewEvent of events) {
      const x = xFor(viewEvent.day);
      const radius = viewEvent.presentation.milestone ? milestoneRadius : markerRadius;
      let row = rowEnds.findIndex((end) => x - radius >= end + labelGap);
      if (row === -1) row = rowEnds.length;
      const right = x + extentRight(viewEvent);
      rowEnds[row] = right;
      placed.push({ view: viewEvent, x, y: top + lanePaddingY + row * rowHeight + rowHeight / 2, right, row });
    }
    const height = Math.max(1, rowEnds.length) * rowHeight + 2 * lanePaddingY;
    for (const item of placed) placedByUid.set(item.view.event.uid, item);
    lanes.push({ lane, top, height, events: placed });
    top += height;
  }

  const connectors: PlacedConnector[] = view.encounters.map((connector) => {
    const x = xFor(connector.day);
    const members = connector.members
      .map((member) => placedByUid.get(member.event.uid))
      .filter((member): member is PlacedEvent => member !== undefined);
    const ys = members.map((member) => member.y);
    return {
      connector,
      x,
      yTop: Math.min(...ys),
      yBottom: Math.max(...ys),
      hasLine: members.length >= 2,
      ticks: members
        .filter((member) => Math.abs(member.x - x) > 0.5)
        .map((member) => ({ x1: member.x, x2: x, y: member.y, uid: member.view.event.uid })),
    };
  });

  const starts = monthStarts(view.range.start, view.range.end);
  const ticks: AxisTick[] =
    starts.length > 0
      ? starts.map((start) => ({ x: xFor(start.day), label: start.label }))
      : [{ x: xFor(view.range.start), label: formatDay(view.range.start) }];

  return {
    // The right padding fits a short label; a longer one at the right edge, or a reference label such as Today,
    // widens the drawing instead of being clipped.
    width: Math.max(
      plotWidth + paddingLeft + rightPadding,
      ...lanes.flatMap((lane) => lane.events.map((item) => item.right + labelGap)),
      ...referenceRowEnds.map((end) => end + labelGap),
    ),
    height: top,
    axisHeight,
    spanBandHeight,
    spans,
    lanes,
    connectors,
    ticks,
    references,
  };
}

function formatDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return `${date} ${MONTHS[month - 1]} ${year}`;
}
