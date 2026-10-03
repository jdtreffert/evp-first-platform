import { normalizerRegistry } from "../../normalizers/normalizerRegistry";
import { airtableEventTypes, platformOnlyEventTypes } from "../eventTypes";

describe("event type lists", () => {
  test("every Airtable event type has a registered normalizer", () => {
    expect(airtableEventTypes.filter((t) => !(t in normalizerRegistry))).toEqual([]);
  });

  test("the two lists do not overlap", () => {
    expect(airtableEventTypes.filter((t) => (platformOnlyEventTypes as readonly string[]).includes(t))).toEqual([]);
  });

  test("together they cover exactly the registry", () => {
    expect([...airtableEventTypes, ...platformOnlyEventTypes].sort()).toEqual(Object.keys(normalizerRegistry).sort());
  });
});
