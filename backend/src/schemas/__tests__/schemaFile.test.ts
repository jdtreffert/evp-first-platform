import { readFileSync } from "fs";
import path from "path";
import { eventFieldCatalog } from "../eventFieldCatalog";
import { buildSchemaTables, toTabDelimited } from "../schemaTables";

const schemaDirectory = path.resolve(__dirname, "../../../schema");

/** Reads an Excel "Unicode Text" export (UTF-16) or a UTF-8 equivalent. */
function readExport(file: string): string[][] {
  const buffer = readFileSync(file);
  const text = buffer[0] === 0xff && buffer[1] === 0xfe ? buffer.toString("utf16le") : buffer.toString("utf8");
  return text.replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n").filter((line) => line.trim()).map((line) => line.split("\t"));
}

describe("version-controlled schema files", () => {
  test("the field catalog matches schema/UnifiedEventsSchema.txt (run node scripts/generateFieldCatalog.mjs)", () => {
    const rows = readExport(path.join(schemaDirectory, "UnifiedEventsSchema.txt")).slice(1);
    const fromFile = Object.fromEntries(rows.map(([name, , options = ""]) => [name.trim(), options.trim()]));

    expect(Object.keys(eventFieldCatalog).sort()).toEqual(Object.keys(fromFile).sort());
    for (const [name, options] of Object.entries(fromFile)) {
      // The generator trims each option, so stray spaces in the file do not matter.
      const expected = options.replace(/^"|"$/g, "").split(";").map((option) => option.trim()).filter(Boolean);
      expect(eventFieldCatalog[name].options ?? []).toEqual(expected);
    }
  });

  test.each(buildSchemaTables().map((table) => [table.name, table] as const))(
    "schema/tables/%s.txt is up to date (run npm run schema:tables)",
    (name, table) => {
      const stored = readExport(path.join(schemaDirectory, "tables", `${name}.txt`));
      const expected = toTabDelimited(table).replace(/\r/g, "").split("\n").filter(Boolean).map((line) => line.split("\t"));
      expect(stored).toEqual(expected);
    },
  );
});
