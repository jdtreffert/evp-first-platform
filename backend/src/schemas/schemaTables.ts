import {
  commonEventFields,
  documentFields,
  eventTypeFields,
  measureFields,
  relatedEventCandidates,
  relationshipFields,
} from "./eventTypeFields";

export interface SchemaTable {
  /** Sheet or file name. */
  name: string;
  columns: string[];
  rows: string[][];
}

/** Multiple values in one cell are separated by semicolons, as in the Options column of the schema sheet. */
const LIST_SEPARATOR = ";";

function dateRule(rule: (typeof relatedEventCandidates)[string]): string {
  if ("withinDays" in rule) return `Within ${rule.withinDays} days either side`;
  if ("priorDays" in rule) return `On or up to ${rule.priorDays} days before the event date`;
  return "On or before the event date";
}

/** The tables that document how the field catalog is applied; they are generated from the code. */
export function buildSchemaTables(): SchemaTable[] {
  return [
    {
      name: "EventTypeFields",
      columns: ["Event_Type", "Fields"],
      rows: Object.entries(eventTypeFields).map(([type, fields]) => [type, fields.join(LIST_SEPARATOR)]),
    },
    {
      name: "CommonFields",
      columns: ["Group", "Fields", "Offered_On"],
      rows: [
        ["Common", commonEventFields.join(LIST_SEPARATOR), "Every event type"],
        ["Document", documentFields.join(LIST_SEPARATOR), "Every event type (optional)"],
        ["Measurement", measureFields.join(LIST_SEPARATOR), "Every event type (optional)"],
        ["Related event", relationshipFields.join(LIST_SEPARATOR), "Event types listed in RelatedEventRules (optional)"],
      ],
    },
    {
      name: "RelatedEventRules",
      columns: ["Event_Type", "Candidate_Event_Types", "Date_Rule", "Default_Relationship"],
      rows: Object.entries(relatedEventCandidates).map(([type, rule]) => [
        type,
        rule.eventTypes.join(LIST_SEPARATOR),
        dateRule(rule),
        rule.relationship,
      ]),
    },
  ];
}

/** Tab-delimited text, one table per file, ready to open or paste into Excel. */
export function toTabDelimited(table: SchemaTable): string {
  return [table.columns, ...table.rows].map((row) => row.join("\t")).join("\r\n") + "\r\n";
}

export function toMarkdown(tables: SchemaTable[]): string {
  const intro = [
    "# Schema tables",
    "",
    "Generated from the code by `npm run schema:tables`; do not edit by hand. These tables hold the parts of",
    "the schema that are not in the field catalog: which fields each event type uses, and which events a new",
    "event can be related to. Several values in one cell are separated by semicolons.",
    "",
  ];
  const sections = tables.flatMap((table) => [
    `## ${table.name}`,
    "",
    `| ${table.columns.join(" | ")} |`,
    `| ${table.columns.map(() => "---").join(" | ")} |`,
    ...table.rows.map((row) => `| ${row.map((cell) => cell.split(LIST_SEPARATOR).join("; ")).join(" | ")} |`),
    "",
  ]);
  return [...intro, ...sections].join("\n");
}
