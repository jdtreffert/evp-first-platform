import { promises as fs } from "fs";
import { Server } from "http";
import { AddressInfo } from "net";
import os from "os";
import path from "path";
import { FileEncounterRepository } from "../encounters/fileEncounterRepository";
import { FileEventRepository } from "../persistence/fileEventRepository";
import { UserRole } from "../auth/authTypes";
import { createAuthenticatedTestApp } from "./testAuth";

interface Client {
  base: string;
  cookie: string;
}

describe("encounters API (HTTP)", () => {
  let dir: string;
  let servers: Server[];
  let admin: Client;
  let clinical: Client;
  let patient1: Client;
  let patient2: Client;

  async function start(
    role: UserRole,
    masterId: string | null,
    events: FileEventRepository,
    encounters: FileEncounterRepository,
  ): Promise<Client> {
    const fixture = await createAuthenticatedTestApp(events, role, masterId, undefined, encounters);
    const server = fixture.app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    servers.push(server);
    return { base: `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`, cookie: fixture.cookie };
  }

  const post = (client: Client, route: string, body: unknown) =>
    fetch(`${client.base}${route}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: client.cookie },
      body: JSON.stringify(body),
    });
  const get = (client: Client, route: string) => fetch(`${client.base}${route}`, { headers: { cookie: client.cookie } });

  const saveEncounter = (client: Client, fields: Record<string, unknown>) =>
    post(client, "/encounters", { id: String(fields.Encounter_UID), fields: { Encounter_Date: "2026-03-04", ...fields } });

  const saveEvent = (client: Client, fields: Record<string, unknown>) =>
    post(client, "/events/ingest", {
      id: String(fields.Event_UID),
      fields: { Event_Type: "Note", Event_Date: "2026-03-04", Event_Details: "x", ...fields },
    });

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "evp-encounters-"));
    servers = [];
    const events = new FileEventRepository(path.join(dir, "events.json"));
    const encounters = new FileEncounterRepository(path.join(dir, "encounters.json"));
    admin = await start("administrator", null, events, encounters);
    clinical = await start("clinical", null, events, encounters);
    patient1 = await start("patient", "M1", events, encounters);
    patient2 = await start("patient", "M2", events, encounters);
  });

  afterEach(async () => {
    await Promise.all(servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
    await fs.rm(dir, { recursive: true, force: true });
  });

  describe("encounters", () => {
    test("an administrator creates an encounter for a patient and reads it back", async () => {
      const res = await saveEncounter(admin, {
        Encounter_UID: "E1", Master_ID: "M1", Encounter_Type: "Infusion visit", Encounter_Summary: "Cycle 2",
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toMatchObject({ uid: "E1", masterId: "M1", encounterDate: "2026-03-04", recordedByRole: "administrator" });
      expect(await (await get(admin, "/encounters/E1")).json()).toMatchObject({ uid: "E1", encounterType: "Infusion visit" });
    });

    test("a patient always writes to their own record, whatever Master_ID they send", async () => {
      const res = await saveEncounter(patient1, { Encounter_UID: "E1", Master_ID: "M2" });

      expect(res.status).toBe(201);
      expect((await res.json()).masterId).toBe("M1");
      expect((await get(patient2, "/encounters/E1")).status).toBe(404);
    });

    test("clinical accounts can read any encounter but cannot create one", async () => {
      await saveEncounter(admin, { Encounter_UID: "E1", Master_ID: "M1" });

      expect((await get(clinical, "/encounters/E1")).status).toBe(200);
      expect((await saveEncounter(clinical, { Encounter_UID: "E2", Master_ID: "M1" })).status).toBe(403);
    });

    test("requires authentication", async () => {
      const res = await fetch(`${admin.base}/encounters/query`);
      expect(res.status).toBe(401);
    });

    test("rejects an invalid encounter with details", async () => {
      const res = await saveEncounter(admin, { Encounter_UID: "E1", Master_ID: "M1", Encounter_Type: "Coffee chat" });
      expect(res.status).toBe(422);
      expect((await post(admin, "/encounters", { nope: true })).status).toBe(400);
      expect((await post(admin, "/encounters", { id: "x", fields: { Master_ID: "M1" } })).status).toBe(422);
    });

    test("lists a patient's encounters newest first; patients see only their own", async () => {
      await saveEncounter(admin, { Encounter_UID: "A", Master_ID: "M1", Encounter_Date: "2026-01-01" });
      await saveEncounter(admin, { Encounter_UID: "B", Master_ID: "M1", Encounter_Date: "2026-02-01" });
      await saveEncounter(admin, { Encounter_UID: "C", Master_ID: "M2", Encounter_Date: "2026-03-01" });

      const asAdmin = await (await get(admin, "/encounters/query?masterId=M1")).json();
      expect(asAdmin.encounters.map((e: { uid: string }) => e.uid)).toEqual(["B", "A"]);

      const asPatient = await (await get(patient1, "/encounters/query?masterId=M2")).json();
      expect(asPatient.encounters.map((e: { uid: string }) => e.uid)).toEqual(["B", "A"]);
      expect((await get(admin, "/encounters/query?bogus=1")).status).toBe(400);
    });

    test("editing keeps the earlier version and the original recorded-at time", async () => {
      await saveEncounter(patient1, { Encounter_UID: "E1", Encounter_Summary: "first" });
      const edited = await saveEncounter(patient1, { Encounter_UID: "E1", Encounter_Summary: "second" });
      expect(edited.status).toBe(200);

      const history = await (await get(patient1, "/encounters/E1/history")).json();
      expect(history.versions.map((v: { encounter: { encounterSummary: string } }) => v.encounter.encounterSummary)).toEqual(["first"]);
      expect((await (await get(patient1, "/encounters/E1")).json()).lastModifiedByRole).toBe("patient");
      expect((await get(patient2, "/encounters/E1/history")).status).toBe(404);
    });

    test("another patient cannot edit it, and it cannot be moved to another patient", async () => {
      await saveEncounter(patient1, { Encounter_UID: "E1" });

      expect((await saveEncounter(patient2, { Encounter_UID: "E1" })).status).toBe(403);
      expect((await saveEncounter(admin, { Encounter_UID: "E1", Master_ID: "M2" })).status).toBe(422);
    });
  });

  describe("linking events to encounters", () => {
    test("an event can link to an existing encounter for the same patient", async () => {
      await saveEncounter(admin, { Encounter_UID: "E1", Master_ID: "M1" });

      const res = await saveEvent(patient1, { Event_UID: "N1", Master_ID: "M1", Encounter_UID: "E1" });
      expect(res.status).toBe(201);
      expect((await res.json()).encounterUid).toBe("E1");
    });

    test("events without an encounter stay valid", async () => {
      const res = await saveEvent(patient1, { Event_UID: "N1" });
      expect(res.status).toBe(201);
      expect((await res.json()).encounterUid).toBeNull();
    });

    test("an event cannot link to a missing encounter or another patient's encounter", async () => {
      await saveEncounter(admin, { Encounter_UID: "E2", Master_ID: "M2" });

      expect((await saveEvent(patient1, { Event_UID: "N1", Encounter_UID: "missing" })).status).toBe(422);
      expect((await saveEvent(patient1, { Event_UID: "N2", Encounter_UID: "E2" })).status).toBe(422);
      expect((await saveEvent(admin, { Event_UID: "N3", Master_ID: "M1", Encounter_UID: "E2" })).status).toBe(422);
    });

    test("an event edit can add and remove the link, keeping history", async () => {
      await saveEncounter(admin, { Encounter_UID: "E1", Master_ID: "M1" });
      await saveEvent(patient1, { Event_UID: "N1" });

      await saveEvent(patient1, { Event_UID: "N1", Encounter_UID: "E1" });
      expect((await (await get(patient1, "/events/N1")).json()).encounterUid).toBe("E1");

      await saveEvent(patient1, { Event_UID: "N1" });
      expect((await (await get(patient1, "/events/N1")).json()).encounterUid).toBeNull();
      expect((await (await get(patient1, "/events/N1/history")).json()).versions).toHaveLength(2);
    });

    test("events can be queried by encounter", async () => {
      await saveEncounter(admin, { Encounter_UID: "E1", Master_ID: "M1" });
      await saveEvent(patient1, { Event_UID: "N1", Encounter_UID: "E1" });
      await saveEvent(patient1, { Event_UID: "N2", Encounter_UID: "E1" });
      await saveEvent(patient1, { Event_UID: "N3" });

      const res = await (await get(patient1, "/events/query?encounterUid=E1")).json();
      expect(res.events.map((e: { uid: string }) => e.uid).sort()).toEqual(["N1", "N2"]);
      expect(res.total).toBe(2);
    });

    test("the encounter date and an event's own date stay independent", async () => {
      await saveEncounter(admin, { Encounter_UID: "E1", Master_ID: "M1", Encounter_Date: "2026-03-04" });
      const event = await (await saveEvent(patient1, { Event_UID: "N1", Event_Date: "2026-03-01", Encounter_UID: "E1" })).json();

      expect(event.eventDate).toBe("2026-03-01");
      expect((await (await get(patient1, "/encounters/E1")).json()).encounterDate).toBe("2026-03-04");
    });
  });
});
