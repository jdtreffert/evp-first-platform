import type { DiagnosisView, EncounterConnector, ViewEvent, ViewLane } from "./diagnosisView";

/** Geometry of the Diagnosis view, in pixels. It lays out what the view model already decided. */
export const GEOMETRY = {
  /** Height of the date axis above the first lane. */
  axisHeight: 44,
  /** Space before the first date. */
  paddingLeft: 48,
  /** Space after the last date, enough for the label of an event on it. */
  paddingRight: 150,
  rowHeight: 40,
  lanePaddingY: 12,
  /** Events in one lane closer than this go on separate rows so their labels do not overlap. */
  minMarkerGap: 120,
  pxPerDay: 6,
  minPlotWidth: 640,
  maxPlotWidth: 6000,
} as const;

export interface PlacedEvent {
  view: ViewEvent;
  x: number;
  y: number;
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

export interface DiagnosisLayout {
  width: number;
  height: number;
  axisHeight: number;
  lanes: PlacedLane[];
  connectors: PlacedConnector[];
  ticks: AxisTick[];
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

/**
 * Turns a Diagnosis view into positions: dates become x positions in proportion to the days between them,
 * lanes stack top to bottom, events that would overlap in a lane move to separate rows, and each
 * encounter gets the line that joins its members. Events are placed by their own date; an encounter's line
 * sits at the encounter's date, with a tick to any member dated differently. It only measures; it changes
 * nothing in the view.
 */
export function layoutDiagnosisView(view: DiagnosisView): DiagnosisLayout {
  const { axisHeight, paddingLeft, paddingRight, rowHeight, lanePaddingY, minMarkerGap, pxPerDay, minPlotWidth, maxPlotWidth } = GEOMETRY;

  const startNumber = dayNumber(view.range.start);
  const span = Math.max(0, dayNumber(view.range.end) - startNumber);
  const plotWidth = Math.min(maxPlotWidth, Math.max(minPlotWidth, span * pxPerDay));
  const xFor = (day: string): number =>
    paddingLeft + (span === 0 ? plotWidth / 2 : ((dayNumber(day) - startNumber) / span) * plotWidth);

  const placedByUid = new Map<string, PlacedEvent>();
  const lanes: PlacedLane[] = [];
  let top = axisHeight;
  for (const { lane, events } of view.lanes) {
    const lastX: number[] = [];
    const placed: PlacedEvent[] = [];
    for (const viewEvent of events) {
      const x = xFor(viewEvent.day);
      let row = lastX.findIndex((last) => x - last >= minMarkerGap);
      if (row === -1) row = lastX.length;
      lastX[row] = x;
      placed.push({ view: viewEvent, x, y: top + lanePaddingY + row * rowHeight + rowHeight / 2, row });
    }
    const height = Math.max(1, lastX.length) * rowHeight + 2 * lanePaddingY;
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

  return { width: plotWidth + paddingLeft + paddingRight, height: top, axisHeight, lanes, connectors, ticks };
}

function formatDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return `${date} ${MONTHS[month - 1]} ${year}`;
}
