import { describe, expect, it } from "vitest";
import { eventTypeFields } from "../../../../backend/src/schemas/eventTypeFields";
import {
  ENCOUNTER_COLOR,
  LANES,
  OTHER_LANE,
  UNASSIGNED_EVENT_TYPES,
  eventTypeLabel,
  lanesFor,
  presentationFor,
} from "../presentationPolicy";

const registeredTypes = Object.keys(eventTypeFields);

describe("lane assignment", () => {
  const expected: Record<string, string[]> = {
    "Symptoms & Experience": ["Symptom", "QoL"],
    Investigations: ["Lab", "Imaging", "Imaging_Response", "Cytology", "Cystoscopy", "ctDNA", "utDNA"],
    Procedures: ["TURBT", "Cystoscopy_Biopsy", "Procedure"],
    "Pathology & Molecular": ["Pathology", "Somatic", "Germline"],
    "Context & Self-Management": ["Note"],
    "Decisions & Milestones": ["Diagnosis", "Decision"],
  };

  it.each(Object.entries(expected))("places the %s event types in that lane", (laneLabel, types) => {
    for (const type of types) {
      const presentation = presentationFor(type);
      expect(presentation.lane.label).toBe(laneLabel);
      expect(presentation.assigned).toBe(true);
    }
  });

  it("draws the lanes in the agreed order", () => {
    expect(LANES.map((lane) => lane.label)).toEqual(Object.keys(expected));
  });

  it("covers every registered event type exactly once, either assigned or deliberately unassigned", () => {
    const unassigned: string[] = [...UNASSIGNED_EVENT_TYPES];
    const assigned = registeredTypes.filter((type) => presentationFor(type).assigned);

    // A new event type in the schema fails here until it is given a lane or listed as unassigned.
    expect(registeredTypes.filter((type) => !assigned.includes(type) && !unassigned.includes(type))).toEqual([]);
    expect(assigned.filter((type) => unassigned.includes(type))).toEqual([]);
    expect(unassigned.filter((type) => !registeredTypes.includes(type))).toEqual([]);
  });

  it("leaves the treatment, recurrence and progression types unassigned", () => {
    expect([...UNASSIGNED_EVENT_TYPES].sort()).toEqual(
      ["Progression", "Recurrence", "Treatment_Change", "Treatment_Delivery", "Treatment_Response", "Treatment_Start"],
    );
    for (const type of UNASSIGNED_EVENT_TYPES) {
      expect(presentationFor(type)).toMatchObject({ lane: OTHER_LANE, assigned: false });
    }
  });

  it("uses every lane for at least one event type", () => {
    const used = new Set(registeredTypes.map((type) => presentationFor(type).lane.id));
    for (const lane of LANES) expect(used.has(lane.id)).toBe(true);
  });
});

describe("unknown event types", () => {
  it("are drawn in the Other lane under their own name instead of failing", () => {
    expect(presentationFor("Some_New_Type")).toEqual({
      label: "Some New Type",
      lane: OTHER_LANE,
      assigned: false,
      milestone: false,
    });
  });

  it("do not pick up properties inherited from Object", () => {
    expect(presentationFor("constructor").assigned).toBe(false);
    expect(presentationFor("toString").lane).toEqual(OTHER_LANE);
  });
});

describe("milestones", () => {
  it("marks the Diagnosis event type as a milestone and no other", () => {
    expect(registeredTypes.filter((type) => presentationFor(type).milestone)).toEqual(["Diagnosis"]);
  });
});

describe("colors", () => {
  it("gives every lane its own color, none matching the encounter line", () => {
    const colors = [...LANES.map((lane) => lane.color), OTHER_LANE.color, ENCOUNTER_COLOR];
    expect(new Set(colors).size).toBe(colors.length);
    for (const color of colors) expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("eventTypeLabel", () => {
  it("uses the friendly names, and the type's own name otherwise", () => {
    expect(eventTypeLabel("QoL")).toBe("Quality of life");
    expect(eventTypeLabel("Lab")).toBe("Lab work");
    expect(eventTypeLabel("Imaging_Response")).toBe("Imaging response");
    expect(eventTypeLabel("Cystoscopy_Biopsy")).toBe("Cystoscopy biopsy");
    expect(eventTypeLabel("Treatment_Delivery")).toBe("Treatment Delivery");
    expect(presentationFor("Lab").label).toBe("Lab work");
  });
});

describe("lanesFor", () => {
  it("returns only the lanes that have events, in the agreed order", () => {
    expect(lanesFor(["Decision", "Symptom", "Imaging", "Lab"]).map((lane) => lane.label)).toEqual([
      "Symptoms & Experience",
      "Investigations",
      "Decisions & Milestones",
    ]);
  });

  it("adds the Other lane last, only when something needs it", () => {
    expect(lanesFor(["Treatment_Start", "Symptom"]).map((lane) => lane.id)).toEqual(["symptoms-experience", "other"]);
    expect(lanesFor(["Symptom"]).map((lane) => lane.id)).toEqual(["symptoms-experience"]);
  });

  it("returns no lanes for no events", () => {
    expect(lanesFor([])).toEqual([]);
  });
});
