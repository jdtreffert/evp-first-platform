import { readFileSync } from "fs";
import path from "path";
import { eventFieldCatalog } from "../eventFieldCatalog";
import { buildSchemaTables, toMarkdown, toTabDelimited } from "../schemaTables";

describe("schema tables", () => {
  const tables = buildSchemaTables();

  test("every field named in a table is in the catalog", () => {
    for (const table of tables.filter((t) => t.name !== "RelatedEventRules")) {
      for (const row of table.rows) {
        for (const field of row[1].split(";")) expect(eventFieldCatalog[field]).toBeDefined();
      }
    }
  });

  test("rows have one cell per column and no tabs or line breaks inside cells", () => {
    for (const table of tables) {
      for (const row of table.rows) {
        expect(row).toHaveLength(table.columns.length);
        for (const cell of row) expect(cell).not.toMatch(/[\t\r\n]/);
      }
    }
  });

  test("tab-delimited output has a header and a row per entry", () => {
    const events = tables.find((t) => t.name === "EventTypeFields")!;
    expect(toTabDelimited(events).trim().split("\r\n")).toHaveLength(events.rows.length + 1);
  });

  test("docs/schema-tables.md is up to date (run npm run schema:tables)", () => {
    const doc = readFileSync(path.resolve(__dirname, "../../../docs/schema-tables.md"), "utf8");
    expect(doc).toBe(toMarkdown(tables));
  });
});
