// Writes the schema tables (field lists per event type, related-event rules) for review in Excel.
// Usage: npx tsx scripts/exportSchemaTables.ts [output directory]  (default: schema/tables)
// Produces one UTF-16 tab-delimited file per table (the same format as Excel's "Unicode Text"),
// and refreshes docs/schema-tables.md.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildSchemaTables, toMarkdown, toTabDelimited } from "../src/schemas/schemaTables";

const tables = buildSchemaTables();
const outputDirectory = path.resolve(process.argv[2] ?? path.resolve(__dirname, "../schema/tables"));
mkdirSync(outputDirectory, { recursive: true });

for (const table of tables) {
  const bytes = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(toTabDelimited(table), "utf16le")]);
  writeFileSync(path.join(outputDirectory, `${table.name}.txt`), bytes);
}
writeFileSync(path.resolve(__dirname, "../docs/schema-tables.md"), toMarkdown(tables));
console.log(`Wrote ${tables.length} tables to ${outputDirectory} and docs/schema-tables.md`);
