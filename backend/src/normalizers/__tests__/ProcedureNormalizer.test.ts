import { ingestEvent } from "../../services/ingestionService";
import { normalizeProcedure } from "../ProcedureNormalizer";
import { testNormalizer } from "./testUtils";

testNormalizer(
  "normalizeProcedure",
  normalizeProcedure,
  "Procedure",
  "Procedure",
  {
    Event_UID: "E1",
    Master_ID: "M1",
    Event_Date: "2025-04-05",
    Procedure_Type: "Ureteral stent placement",
    Procedure_Result: "Uncomplicated",
    Procedure_Notes: "Left side",
  },
  {
    eventSummary: "Procedure: Ureteral stent placement",
    procedureType: "Ureteral stent placement",
    procedureResult: "Uncomplicated",
    procedureNotes: "Left side",
  },
);

describe("Procedure", () => {
  const base = { Master_ID: "M1", Event_Date: "2025-04-05", Event_Type: "Procedure" };

  test("Procedure_Type must be a defined option", () => {
    expect(() => ingestEvent({ id: "p1", fields: { ...base, Event_UID: "p1", Procedure_Type: "Haircut" } })).toThrow();
    expect(ingestEvent({ id: "p2", fields: { ...base, Event_UID: "p2", Procedure_Type: "Port placement" } }).procedureType)
      .toBe("Port placement");
  });
});
