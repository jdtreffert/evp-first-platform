// Regenerates src/schemas/eventFieldCatalog.ts from the UnifiedEventsSchema export
// (Excel "Unicode Text", tab-delimited UTF-16 or UTF-8).
// Usage: node scripts/generateFieldCatalog.mjs ~/Downloads/UnifiedEventsSchema.txt
import { readFileSync, writeFileSync } from "node:fs";

const input = process.argv[2];
if (!input) throw new Error("Pass the path to UnifiedEventsSchema.txt");

const buffer = readFileSync(input);
const text = buffer[0] === 0xff && buffer[1] === 0xfe ? buffer.toString("utf16le") : buffer.toString("utf8");

const kinds = {
  autonumber: "system",
  "created time": "system",
  "single line text": "text",
  "date(iso)": "date",
  "single select": "single",
  "multple select": "multi",
  "multiple select": "multi",
  "long text": "longText",
  number: "number",
  "linked record": "linked",
  attachment: "attachment",
};

const lines = text.replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n").slice(1).filter((l) => l.trim());
const entries = lines.map((line) => {
  const [rawName, rawType = "", rawOptions = ""] = line.split("\t").map((c) => c.trim().replace(/^"|"$/g, ""));
  const kind = kinds[rawType.replace(/`/g, "").toLowerCase()];
  if (!kind) throw new Error(`Unknown field type "${rawType}" for ${rawName}`);
  const options = rawOptions.split(";").map((o) => o.trim()).filter(Boolean);
  const optionText = options.length
    ? `, options: [\n${options.map((o) => `      ${JSON.stringify(o)},\n`).join("")}    ]`
    : "";
  return `  ${rawName}: { name: "${rawName}", kind: "${kind}"${optionText} },\n`;
});

const path = new URL("../src/schemas/eventFieldCatalog.ts", import.meta.url);
const current = readFileSync(path, "utf8");
const start = current.indexOf("export const eventFieldCatalog");
const header = current.slice(0, start);
writeFileSync(path, `${header}export const eventFieldCatalog: Record<string, FieldDefinition> = {\n${entries.join("")}};\n`);
console.log(`Wrote ${entries.length} fields`);
