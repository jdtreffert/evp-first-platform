import { normalizeTreatment } from "../TreatmentNormalizer";
import { mockRecord } from "./testUtils";

describe("normalizeTreatment", () => {
  test.each([
    [
      "treatment start",
      { Treatment_Start_Date: "2024-01-02", Treatment_Name: "Drug A" },
      "Treatment_Start",
    ],
    [
      "treatment change",
      { Treatment_Change_Date: "2024-01-02", Treatment_Change_Reason: "Toxicity" },
      "Treatment_Change",
    ],
    [
      "treatment response",
      { Treatment_Response_Date: "2024-01-02", Treatment_Response_Category: "Partial" },
      "Treatment_Response",
    ],
    [
      "schema-named treatment start",
      { Treatment_Name: "EVP", Treatment_Intent: "Bladder-preserving" },
      "Treatment_Start",
    ],
    [
      "schema-named treatment change",
      { Treatment_Change_Type: "Hold" },
      "Treatment_Change",
    ],
    [
      "schema-named treatment response",
      { Treatment_Response_Category: "CR" },
      "Treatment_Response",
    ],
  ])("selects the %s normalizer", (_label, fields, eventType) => {
    const raw = mockRecord(fields);
    const inputBefore = JSON.stringify(raw);

    expect(normalizeTreatment(raw).eventType).toBe(eventType);
    expect(JSON.stringify(raw)).toBe(inputBefore);
  });

  test("rejects records without a recognized treatment subtype", () => {
    expect(() => normalizeTreatment(mockRecord())).toThrow(
      "Unknown Treatment subtype — no matching fields found",
    );
  });
});
