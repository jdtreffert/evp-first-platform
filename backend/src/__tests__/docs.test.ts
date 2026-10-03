import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";
import { normalizerRegistry } from "../normalizers/normalizerRegistry";

const backendDir = path.resolve(__dirname, "../..");
const docsDir = path.join(backendDir, "docs");

describe("documentation", () => {
  test("the registry doc lists every registered event type", () => {
    const doc = readFileSync(path.join(docsDir, "normalizer-registry.md"), "utf8");

    const missing = Object.keys(normalizerRegistry).filter((type) => !doc.includes(`| \`${type}\` |`));
    expect(missing).toEqual([]);
  });

  test("the registry doc does not list unregistered event types", () => {
    const doc = readFileSync(path.join(docsDir, "normalizer-registry.md"), "utf8");
    const listed = [...doc.matchAll(/^\| `([A-Za-z_]+)` \| `normalize/gm)].map((m) => m[1]);

    expect(listed.sort()).toEqual(Object.keys(normalizerRegistry).sort());
  });

  const docFiles = [
    path.join(backendDir, "README.md"),
    path.join(backendDir, "src/schemas/UnifiedEventSpec.md"),
    ...readdirSync(docsDir).filter((f) => f.endsWith(".md")).map((f) => path.join(docsDir, f)),
  ];

  test.each(docFiles.map((f) => [path.relative(backendDir, f), f]))(
    "%s has no broken relative links",
    (_name, file) => {
      const text = readFileSync(file, "utf8");
      const targets = [...text.matchAll(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g)].map((m) => m[1].split("#")[0]);

      const broken = targets.filter((t) => t !== "" && !existsSync(path.resolve(path.dirname(file), t)));
      expect(broken).toEqual([]);
    },
  );
});
