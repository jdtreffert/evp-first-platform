import { promises as fs } from "fs";
import { Server } from "http";
import { AddressInfo } from "net";
import os from "os";
import path from "path";
import { FileEventRepository } from "../persistence/fileEventRepository";
import { UserRole } from "../auth/authTypes";
import { createAuthenticatedTestApp } from "./testAuth";

interface Client {
  base: string;
  cookie: string;
}

describe("editing events keeps version history", () => {
  let dir: string;
  let servers: Server[];
  let admin: Client;
  let clinical: Client;
  let patient1: Client;
  let patient2: Client;

  async function start(role: UserRole, masterId: string | null, repository: FileEventRepository): Promise<Client> {
    const fixture = await createAuthenticatedTestApp(repository, role, masterId);
    const server = fixture.app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    servers.push(server);
    return { base: `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/events`, cookie: fixture.cookie };
  }

  const save = (client: Client, details: string, master = "M1") =>
    fetch(`${client.base}/ingest`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: client.cookie },
      body: JSON.stringify({
        id: "E1",
        fields: { Event_Type: "Note", Event_UID: "E1", Master_ID: master, Event_Date: "2026-01-02", Event_Details: details },
      }),
    });

  const history = (client: Client) => fetch(`${client.base}/E1/history`, { headers: { cookie: client.cookie } });

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "evp-edit-"));
    servers = [];
    const repository = new FileEventRepository(path.join(dir, "events.json"));
    admin = await start("administrator", null, repository);
    clinical = await start("clinical", null, repository);
    patient1 = await start("patient", "M1", repository);
    patient2 = await start("patient", "M2", repository);
  });

  afterEach(async () => {
    await Promise.all(servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("a patient's edit replaces the event and preserves the earlier versions", async () => {
    expect((await save(patient1, "first")).status).toBe(201);
    expect((await save(patient1, "second")).status).toBe(200);
    expect((await save(patient1, "third")).status).toBe(200);

    const body = await (await history(patient1)).json();
    expect(body.versions.map((v: { event: { payload: { fields: { Event_Details: string } } } }) => v.event.payload.fields.Event_Details))
      .toEqual(["first", "second"]);
    expect(body.versions[0]).toMatchObject({ supersededByRole: "patient" });

    const current = await (await fetch(`${patient1.base}/E1`, { headers: { cookie: patient1.cookie } })).json();
    expect(current.payload.fields.Event_Details).toBe("third");
    expect(current.lastModifiedByRole).toBe("patient");
  });

  test("a new event has an empty history", async () => {
    await save(patient1, "only");
    expect((await (await history(patient1)).json()).versions).toEqual([]);
  });

  test("another patient can neither edit nor read the history", async () => {
    await save(patient1, "mine");

    expect((await save(patient2, "hijack", "M2")).status).toBe(403);
    expect((await history(patient2)).status).toBe(404);
    expect((await save(patient2, "hijack", "M1")).status).toBe(403);
  });

  test("an administrator cannot move an event to another patient", async () => {
    await save(patient1, "mine");
    expect((await save(admin, "moved", "M2")).status).toBe(422);
  });

  test("clinical accounts can read history but cannot edit", async () => {
    await save(patient1, "a");
    await save(patient1, "b");

    expect((await history(clinical)).status).toBe(200);
    expect((await save(clinical, "c")).status).toBe(403);
  });
});
