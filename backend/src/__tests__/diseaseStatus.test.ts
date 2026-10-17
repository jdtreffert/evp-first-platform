import { promises as fs } from "fs";
import { Server } from "http";
import { AddressInfo } from "net";
import os from "os";
import path from "path";
import { InMemoryEventRepository } from "../persistence/__tests__/inMemoryEventRepository";
import { FileEventRepository } from "../persistence/fileEventRepository";
import { normalizeDiseaseStatus } from "../normalizers/DiseaseStatusNormalizer";
import { normalizerRegistry } from "../normalizers/normalizerRegistry";
import { eventFieldCatalog } from "../schemas/eventFieldCatalog";
import { eventTypeFields, relatedEventCandidates, requiredEventTypeFields } from "../schemas/eventTypeFields";
import { ingestEvent } from "../services/ingestionService";
import { persistEvent } from "../services/persistenceService";
import { validateEvent } from "../services/validationService";
import { HttpError } from "../utils/httpError";
import { createAuthenticatedTestApp } from "./testAuth";

const CATEGORIES = ["No evidence of disease", "Indeterminate or suspicious", "Disease present", "Unknown"];
const EXTENTS = ["Local", "Regional", "Metastatic", "Multiple", "Not specified", "Unknown"];
const BASES = [
  "Clinician documented",
  "Patient recorded from clinician communication",
  "Documented in source record",
  "Patient asserted",
  "Other",
  "Unknown",
];
const CONFIDENCES = ["Confirmed", "Probable", "Possible", "Indeterminate", "Unknown"];

const status = (fields: Record<string, unknown> = {}, uid = "DS1"): { id: string; fields: Record<string, unknown> } => ({
  id: uid,
  fields: {
    Event_Type: "Disease_Status",
    Event_UID: uid,
    Master_ID: "M1",
    Event_Date: "2026-08-15",
    Disease_Status_Category: "No evidence of disease",
    ...fields,
  },
});

async function rejection(record: unknown): Promise<HttpError> {
  try {
    ingestEvent(record);
  } catch (error) {
    return error as HttpError;
  }
  throw new Error("expected the record to be rejected");
}

describe("Disease_Status is accepted and validated", () => {
  test("Disease_Status is a registered Event_Type and an entry form type", () => {
    expect(eventFieldCatalog.Event_Type.options).toContain("Disease_Status");
    expect(normalizerRegistry.Disease_Status).toBe(normalizeDiseaseStatus);
    expect(ingestEvent(status()).eventType).toBe("Disease_Status");
  });

  test.each([
    ["Disease_Status_Category", CATEGORIES],
    ["Disease_Status_Extent", EXTENTS],
    ["Disease_Status_Basis", BASES],
    ["Disease_Status_Confidence", CONFIDENCES],
  ])("%s offers exactly the specified options, and each is accepted", (name, options) => {
    expect(eventFieldCatalog[name].kind).toBe("single");
    expect(eventFieldCatalog[name].options).toEqual(options);
    for (const option of options) {
      expect(() => ingestEvent(status({ [name]: option }))).not.toThrow();
    }
  });

  test.each([
    ["Disease_Status_Category", "Cured"],
    ["Disease_Status_Category", "no evidence of disease"],
    ["Disease_Status_Category", " Disease present"],
    ["Disease_Status_Extent", "Distant"],
    ["Disease_Status_Basis", "Guess"],
    ["Disease_Status_Confidence", "Certain"],
  ])("rejects %s = %j", async (name, value) => {
    const error = await rejection(status({ [name]: value }));
    expect(error).toMatchObject({ status: 422 });
    expect(JSON.stringify(error.details)).toContain(`fields.${name}`);
  });

  test("Disease_Status_Notes is a long text field and is preserved as written", () => {
    expect(eventFieldCatalog.Disease_Status_Notes.kind).toBe("longText");
    const notes = "  Per Dr. A on 8/15:\nno evidence of disease on scan and cystoscopy.  ";
    const event = ingestEvent(status({ Disease_Status_Notes: notes }));
    expect(event.diseaseStatusNotes).toBe(notes);
    expect(event.eventDetails?.diseaseStatusNotes).toBe(notes);
  });

  test("every structured field is preserved, with Event_Source and the raw record", () => {
    const record = status({
      Disease_Status_Extent: "Not specified",
      Disease_Status_Basis: "Patient recorded from clinician communication",
      Disease_Status_Confidence: "Probable",
      Event_Source: "Patient",
    });
    const event = ingestEvent(record);

    expect(event).toMatchObject({
      diseaseStatusCategory: "No evidence of disease",
      diseaseStatusExtent: "Not specified",
      diseaseStatusBasis: "Patient recorded from clinician communication",
      diseaseStatusConfidence: "Probable",
      eventSource: "Patient",
      eventDate: "2026-08-15",
    });
    expect(event.payload.fields.Disease_Status_Basis).toBe("Patient recorded from clinician communication");
  });

  test("blank optional fields become null, as for other event types", () => {
    const event = ingestEvent(status({ Disease_Status_Extent: "", Disease_Status_Basis: "", Disease_Status_Notes: "" }));
    expect(event).toMatchObject({ diseaseStatusExtent: null, diseaseStatusBasis: null, diseaseStatusNotes: null, diseaseStatusConfidence: null });
  });
});

describe("Disease_Status_Category is required", () => {
  test("the registry requires it, for this type only", () => {
    expect(requiredEventTypeFields).toEqual({ Disease_Status: ["Disease_Status_Category"] });
    expect(eventTypeFields.Disease_Status).toContain("Disease_Status_Category");
  });

  test.each([undefined, "", "   ", null])("a record with Category %j is rejected with 422 and the field's path", async (value) => {
    const record = status();
    if (value === undefined) delete record.fields.Disease_Status_Category;
    else record.fields.Disease_Status_Category = value as string;
    const error = await rejection(record);

    expect(error.status).toBe(422);
    expect(JSON.stringify(error.details)).toContain("fields.Disease_Status_Category");
  });

  test("notes alone never make a valid status: nothing is read from them", async () => {
    const record = status({ Disease_Status_Notes: "No evidence of disease, complete response" });
    delete record.fields.Disease_Status_Category;
    expect((await rejection(record)).status).toBe(422);
  });

  test("the validate rule applies to an event built without a category", () => {
    const withoutCategory = normalizeDiseaseStatus({ id: "x", fields: { Master_ID: "M1", Event_Date: "2026-08-15" } });
    const result = validateEvent(withoutCategory);
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.path)).toEqual(["payload.fields.Disease_Status_Category"]);
    expect(validateEvent(ingestEvent(status()))).toEqual({ valid: true, errors: [] });
  });

  test("a record can still be edited with its category kept", () => {
    expect(() => ingestEvent(status({ Disease_Status_Category: "Disease present", Disease_Status_Confidence: "Confirmed" }))).not.toThrow();
  });
});

describe("existing event types are unaffected", () => {
  const base = { Master_ID: "M1", Event_Date: "2026-08-15" };

  test.each(Object.keys(eventTypeFields).filter((type) => type !== "Disease_Status"))(
    "%s has no Disease_Status fields and no required field",
    (type) => {
      expect(eventTypeFields[type].filter((name) => name.startsWith("Disease_Status"))).toEqual([]);
      expect(requiredEventTypeFields[type]).toBeUndefined();
    },
  );

  test.each([
    ["Recurrence", { Recurrence_Location: "Bladder" }],
    ["Progression", { Progression_Location: "Lung" }],
    ["Decision", { Decision_Type: "Complete response confirmed" }],
    ["Treatment_Response", { Treatment_Response_Category: "CR" }],
    ["Imaging", { Imaging_Modality: "CT" }],
    ["ctDNA", { ctDNA_Value: 0 }],
    ["Note", { Event_Details: "text" }],
  ])("%s is valid with no Disease_Status fields", (type, fields) => {
    const event = ingestEvent({ id: "e", fields: { ...base, Event_Type: type, Event_UID: "e", ...fields } });
    expect(event.eventType).toBe(type);
    expect(event.diseaseStatusCategory).toBeUndefined();
  });

  test("Disease_Status fields sent with another type are not applied to it", () => {
    const event = ingestEvent({
      id: "e",
      fields: { ...base, Event_Type: "Recurrence", Event_UID: "e", Recurrence_Location: "Bladder", Disease_Status_Category: "Disease present" },
    });
    expect(event.eventType).toBe("Recurrence");
    for (const key of ["diseaseStatusCategory", "diseaseStatusExtent", "diseaseStatusBasis", "diseaseStatusConfidence", "diseaseStatusNotes"]) {
      expect(event).not.toHaveProperty(key);
    }
  });

  test("a Disease_Status event carries none of the Recurrence, Progression or Treatment_Response fields", () => {
    const event = ingestEvent(status({ Recurrence_Location: "Bladder", Treatment_Response_Category: "CR" }));
    expect(event.eventType).toBe("Disease_Status");
    for (const key of ["recurrenceLocation", "progressionLocation", "treatmentResponseCategory"]) expect(event).not.toHaveProperty(key);
  });
});

describe("Disease_Status never infers or creates anything", () => {
  test("the normalizer reads the category only from the category field, never from notes or summary", () => {
    const event = normalizeDiseaseStatus({
      id: "n",
      fields: {
        Event_Date: "2026-08-15",
        Disease_Status_Notes: "No evidence of disease. Complete response. Confirmed, local, per the clinician.",
      },
    });
    expect(event).toMatchObject({
      diseaseStatusCategory: null,
      diseaseStatusExtent: null,
      diseaseStatusBasis: null,
      diseaseStatusConfidence: null,
      eventSummary: "Disease status",
    });
  });

  test("the default summary comes from the recorded category, and a supplied summary is kept without changing it", () => {
    expect(ingestEvent(status()).eventSummary).toBe("Disease status: No evidence of disease");
    const supplied = ingestEvent(status({ Event_Summary: "Post-scan review" }));
    expect(supplied.eventSummary).toBe("Post-scan review");
    expect(supplied.diseaseStatusCategory).toBe("No evidence of disease");
  });

  test("the normalizer returns one event and does not mutate its input", () => {
    const raw = status({ Disease_Status_Category: "Disease present", Disease_Status_Extent: "Metastatic" });
    const before = JSON.stringify(raw);
    const event = normalizeDiseaseStatus(raw);

    expect(Array.isArray(event)).toBe(false);
    expect(event.payload).toBe(raw);
    expect(JSON.stringify(raw)).toBe(before);
  });

  test("recording Disease present creates no Recurrence or Progression and changes no other event", async () => {
    const repository = new InMemoryEventRepository();
    const imaging = ingestEvent({ id: "I1", fields: { Event_Type: "Imaging", Event_UID: "I1", Master_ID: "M1", Event_Date: "2026-08-10", Imaging_Modality: "CT" } });
    const response = ingestEvent({ id: "R1", fields: { Event_Type: "Treatment_Response", Event_UID: "R1", Master_ID: "M1", Event_Date: "2026-07-01", Treatment_Response_Category: "CR" } });
    await persistEvent(repository, imaging);
    await persistEvent(repository, response);
    const before = JSON.stringify([...repository.events.values()]);

    await persistEvent(
      repository,
      ingestEvent(status({ Disease_Status_Category: "Disease present", Event_Related_UID: "I1", Event_Relationship: "Derived_From" })),
    );

    const stored = [...repository.events.values()];
    expect(stored.map((e) => e.eventType).sort()).toEqual(["Disease_Status", "Imaging", "Treatment_Response"]);
    expect(JSON.stringify(stored.filter((e) => e.eventType !== "Disease_Status"))).toBe(
      JSON.stringify(JSON.parse(before)),
    );
    expect(await repository.history("I1")).toEqual([]);
    expect(await repository.history("R1")).toEqual([]);
  });

  test("a complete response and no adverse events do not produce a status", async () => {
    const repository = new InMemoryEventRepository();
    await persistEvent(
      repository,
      ingestEvent({ id: "R1", fields: { Event_Type: "Treatment_Response", Event_UID: "R1", Master_ID: "M1", Event_Date: "2026-07-01", Treatment_Response_Category: "CR" } }),
    );
    expect([...repository.events.values()].some((e) => e.eventType === "Disease_Status")).toBe(false);
  });
});

describe("Disease_Status and the existing relationship and encounter model", () => {
  test("it can exist without an encounter", async () => {
    const repository = new InMemoryEventRepository();
    const event = ingestEvent(status());
    await persistEvent(repository, event);

    expect(event.encounterUid).toBeNull();
    expect((await repository.getByUid("DS1"))?.encounterUid).toBeNull();
  });

  test("it can name one supporting event, and a later status can follow an earlier one", async () => {
    const repository = new InMemoryEventRepository();
    await persistEvent(repository, ingestEvent({ id: "C1", fields: { Event_Type: "ctDNA", Event_UID: "C1", Master_ID: "M1", Event_Date: "2026-08-10", ctDNA_Value: 0 } }));
    await persistEvent(repository, ingestEvent(status({ Event_Related_UID: "C1", Event_Relationship: "Assessed_By" })));
    await persistEvent(repository, ingestEvent(status({ Event_Date: "2026-11-20", Event_Related_UID: "DS1", Event_Relationship: "Follow_up_to" }, "DS2")));

    expect(await repository.getByUid("DS1")).toMatchObject({ relatedEventUid: "C1", eventRelationship: "Assessed_By" });
    expect(await repository.getByUid("DS2")).toMatchObject({ relatedEventUid: "DS1", eventRelationship: "Follow_up_to" });
  });

  test("the relationship rules still apply: the supporting event must exist and be the patient's own", async () => {
    const repository = new InMemoryEventRepository();
    await persistEvent(repository, ingestEvent({ id: "C9", fields: { Event_Type: "ctDNA", Event_UID: "C9", Master_ID: "M2", Event_Date: "2026-08-10", ctDNA_Value: 0 } }));

    await expect(persistEvent(repository, ingestEvent(status({ Event_Related_UID: "nope", Event_Relationship: "Derived_From" })))).rejects.toMatchObject({ status: 422 });
    await expect(persistEvent(repository, ingestEvent(status({ Event_Related_UID: "C9", Event_Relationship: "Derived_From" })))).rejects.toMatchObject({ status: 422 });
  });

  test("the form offers the evidence types and exactly one supporting event", () => {
    const rule = relatedEventCandidates.Disease_Status;
    expect(rule.relationship).toBe("Derived_From");
    expect(eventFieldCatalog.Event_Relationship.options).toEqual(
      expect.arrayContaining(["Derived_From", "Assessed_By", "Follow_up_to", "Related_To"]),
    );
    expect(eventTypeFields.Disease_Status.filter((name) => /Related|Relationship/.test(name))).toEqual([]);
  });
});

describe("Disease_Status through the API", () => {
  let dir: string;
  let server: Server;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "evp-disease-status-"));
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("a patient's status keeps its source, basis and server-set provenance, and is read back unchanged", async () => {
    const fixture = await createAuthenticatedTestApp(new FileEventRepository(path.join(dir, "events.json")), "patient", "M1");
    server = fixture.app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/events`;
    const headers = { "content-type": "application/json", cookie: fixture.cookie };

    const saved = await fetch(`${base}/ingest`, {
      method: "POST",
      headers,
      body: JSON.stringify(status({ Event_Source: "Patient", Disease_Status_Basis: "Patient recorded from clinician communication", Disease_Status_Confidence: "Probable" })),
    });
    expect(saved.status).toBe(201);
    const stored = await (await fetch(`${base}/DS1`, { headers })).json();

    expect(stored).toMatchObject({
      eventType: "Disease_Status",
      eventSource: "Patient",
      diseaseStatusCategory: "No evidence of disease",
      diseaseStatusBasis: "Patient recorded from clinician communication",
      diseaseStatusConfidence: "Probable",
      recordedByRole: "patient",
    });
    expect(stored.recordedAt).toEqual(expect.any(String));

    const missing = await fetch(`${base}/ingest`, { method: "POST", headers, body: JSON.stringify(status({ Disease_Status_Category: "" }, "DS2")) });
    expect(missing.status).toBe(422);
  });
});
