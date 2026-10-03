import { normalizerRegistry } from "../normalizerRegistry";
import { mockRecord } from "./testUtils";

describe("normalizerRegistry", () => {
  test.each(Object.entries(normalizerRegistry).filter(([type]) => type !== "Treatment"))(
    "%s normalizer emits its own event type",
    (type, normalizer) => {
      expect(normalizer(mockRecord()).eventType).toBe(type);
    },
  );

  test("registers the generic Treatment dispatcher and Cystoscopy_Biopsy", () => {
    expect(normalizerRegistry.Treatment).toBeDefined();
    expect(normalizerRegistry.Cystoscopy_Biopsy).toBeDefined();
  });
});
