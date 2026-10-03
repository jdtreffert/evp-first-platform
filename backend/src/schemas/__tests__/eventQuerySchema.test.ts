import { DEFAULT_LIMIT, MAX_LIMIT, eventQuerySchema } from "../eventQuerySchema";

describe("eventQuerySchema", () => {
  test("applies defaults", () => {
    expect(eventQuerySchema.parse({})).toEqual({ order: "asc", limit: DEFAULT_LIMIT, offset: 0 });
  });

  test("parses and coerces valid parameters", () => {
    expect(
      eventQuerySchema.parse({ masterId: "M1", eventType: "Labs", from: "2024-01-01", to: "2024-02-29", order: "desc", limit: "10", offset: "20" }),
    ).toEqual({ masterId: "M1", eventType: "Labs", from: "2024-01-01", to: "2024-02-29", order: "desc", limit: 10, offset: 20 });
  });

  test.each([
    [{ from: "2024-02-30" }],
    [{ to: "01/02/2024" }],
    [{ from: "2024-01-01T10:00Z" }],
    [{ from: "2024-03-01", to: "2024-01-01" }],
    [{ limit: "0" }],
    [{ limit: String(MAX_LIMIT + 1) }],
    [{ limit: "-1" }],
    [{ limit: "1.5" }],
    [{ limit: "abc" }],
    [{ offset: "-1" }],
    [{ order: "sideways" }],
    [{ masterId: "" }],
    [{ masterID: "M1" }],
    [{ masterId: ["a", "b"] }],
  ])("rejects %j", (input) => {
    expect(eventQuerySchema.safeParse(input).success).toBe(false);
  });
});
