import type { KeyboardEvent } from "react";
import { ENCOUNTER_COLOR } from "../../journey/presentationPolicy";
import { GEOMETRY } from "../../journey/phaseLayout";
import type { PhaseLayout, PlacedEvent } from "../../journey/phaseLayout";

/** What is selected in the timeline, by uid. */
export type PhaseSelection = { kind: "event" | "encounter"; uid: string } | null;

// The same sizes the layout uses to keep labels from overlapping.
const MARKER = GEOMETRY.markerRadius;
const MILESTONE = GEOMETRY.milestoneRadius;
const LABEL_WIDTH = 168;

function activate(action: () => void) {
  return (keyEvent: KeyboardEvent) => {
    if (keyEvent.key === "Enter" || keyEvent.key === " ") {
      keyEvent.preventDefault();
      action();
    }
  };
}

function describe(item: PlacedEvent): string {
  const { event, presentation, day, label } = item.view;
  return [presentation.label, label !== presentation.label ? label : null, day, event.eventSummary, event.treatmentDeliveryStatus]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Draws a phase view laid out by `layoutPhaseView`: one band per lane, a date axis, a marker for every
 * event, and a line joining the events of each encounter. It decides nothing about the data; positions, lanes
 * and colors all come from the layout and the presentation policy.
 */
export default function PhaseTimeline({
  layout,
  label,
  selection,
  onSelectEvent,
  onSelectEncounter,
}: {
  layout: PhaseLayout;
  /** The accessible name of the timeline, for example "Diagnosis timeline". */
  label: string;
  selection: PhaseSelection;
  onSelectEvent: (uid: string) => void;
  onSelectEncounter: (uid: string) => void;
}) {
  // Members of the selected encounter are ringed so it is clear what the line joins.
  const ringed = new Set<string>();
  if (selection?.kind === "event") ringed.add(selection.uid);
  if (selection?.kind === "encounter") {
    const picked = layout.connectors.find((placed) => placed.connector.encounter.uid === selection.uid);
    for (const member of picked?.connector.members ?? []) ringed.add(member.event.uid);
  }

  return (
    <div className="flex overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
      <div className="relative shrink-0 border-r border-gray-700" style={{ width: LABEL_WIDTH, height: layout.height }}>
        {layout.lanes.map(({ lane, top, height }) => (
          <div
            key={lane.id}
            className="absolute left-0 right-0 flex items-center gap-2 border-t border-gray-800 px-3 text-sm text-gray-200"
            style={{ top, height }}
          >
            <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: lane.color }} />
            {lane.label}
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <svg
          width={layout.width}
          height={layout.height}
          role="group"
          aria-label={label}
          className="block text-gray-200"
        >
          {layout.lanes.map(({ lane, top, height }, index) => (
            <rect key={lane.id} x={0} y={top} width={layout.width} height={height} fill={lane.color} opacity={index % 2 === 0 ? 0.08 : 0.04} />
          ))}

          {layout.ticks.map((tick) => (
            <g key={`${tick.label}-${tick.x}`}>
              <line x1={tick.x} x2={tick.x} y1={layout.axisHeight - 8} y2={layout.height} stroke="#374151" strokeDasharray="2 4" />
              <text x={tick.x + 4} y={layout.axisHeight - 14} fontSize={12} fill="#9ca3af">{tick.label}</text>
            </g>
          ))}

          {layout.references.map((reference) => (
            <g key={`${reference.label}-${reference.day}`}>
              <title>{`${reference.label} · ${reference.day}`}</title>
              <line x1={reference.x} x2={reference.x} y1={14 + reference.row * GEOMETRY.referenceRowHeight} y2={layout.height} stroke="#f9fafb" strokeWidth={1.5} strokeDasharray="6 4" />
              <text
                x={reference.x + 6}
                y={14 + reference.row * GEOMETRY.referenceRowHeight}
                fontSize={12}
                fontWeight={600}
                fill="#f9fafb"
                stroke="#111827"
                strokeWidth={3}
                paintOrder="stroke"
                strokeLinejoin="round"
              >
                {reference.label}
              </text>
            </g>
          ))}

          {layout.connectors.map((placed) => {
            const { encounter } = placed.connector;
            const selected = selection?.kind === "encounter" && selection.uid === encounter.uid;
            const label = `Encounter ${placed.connector.day}${encounter.encounterType ? ` · ${encounter.encounterType}` : ""}`;
            return (
              <g
                key={encounter.uid}
                role="button"
                tabIndex={0}
                aria-label={label}
                onClick={() => onSelectEncounter(encounter.uid)}
                onKeyDown={activate(() => onSelectEncounter(encounter.uid))}
                className="cursor-pointer focus:outline-none"
              >
                <title>{label}</title>
                {placed.ticks.map((tick) => (
                  <line key={tick.uid} x1={tick.x1} x2={tick.x2} y1={tick.y} y2={tick.y} stroke={ENCOUNTER_COLOR} strokeWidth={selected ? 2 : 1} strokeDasharray="4 3" />
                ))}
                {placed.hasLine && (
                  <>
                    {/* A wide transparent stroke makes the thin line easy to click. */}
                    <line x1={placed.x} x2={placed.x} y1={placed.yTop} y2={placed.yBottom} stroke="transparent" strokeWidth={14} />
                    <line x1={placed.x} x2={placed.x} y1={placed.yTop} y2={placed.yBottom} stroke={ENCOUNTER_COLOR} strokeWidth={selected ? 4 : 2} />
                  </>
                )}
              </g>
            );
          })}

          {layout.lanes.flatMap(({ lane, events }) =>
            events.map((item) => {
              const { event, presentation } = item.view;
              const milestone = presentation.milestone;
              const isSelected = ringed.has(event.uid);
              return (
                <g
                  key={event.uid}
                  transform={`translate(${item.x} ${item.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={describe(item)}
                  onClick={() => onSelectEvent(event.uid)}
                  onKeyDown={activate(() => onSelectEvent(event.uid))}
                  className="cursor-pointer focus:outline-none"
                >
                  <title>{describe(item)}</title>
                  {isSelected && <circle r={(milestone ? MILESTONE : MARKER) + 5} fill="none" stroke="#ffffff" strokeWidth={2} />}
                  {milestone ? (
                    <polygon
                      points={`0,${-MILESTONE} ${MILESTONE},0 0,${MILESTONE} ${-MILESTONE},0`}
                      fill={lane.color}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  ) : (
                    <circle
                      r={MARKER}
                      fill={item.view.hollow ? "#111827" : lane.color}
                      stroke={item.view.hollow ? lane.color : "#111827"}
                      strokeWidth={item.view.hollow ? 3 : 2}
                    />
                  )}
                  {/* The dark outline keeps the label readable where an encounter line or grid line passes behind it. */}
                  <text
                    x={(milestone ? MILESTONE : MARKER) + GEOMETRY.labelOffset}
                    y={4}
                    fontSize={12}
                    fontWeight={milestone ? 700 : 400}
                    fill="#e5e7eb"
                    stroke="#111827"
                    strokeWidth={3}
                    paintOrder="stroke"
                    strokeLinejoin="round"
                  >
                    {item.view.label}
                  </text>
                </g>
              );
            }),
          )}
        </svg>
      </div>
    </div>
  );
}
