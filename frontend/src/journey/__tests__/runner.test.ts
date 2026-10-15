import { describe, expect, it } from "vitest";
import { eventTypeFields } from "../../../../backend/src/schemas/eventTypeFields";

describe("frontend test runner", () => {
  it("can import the shared schema modules the journey logic will use", () => {
    expect(Object.keys(eventTypeFields)).toContain("Diagnosis");
  });
});
