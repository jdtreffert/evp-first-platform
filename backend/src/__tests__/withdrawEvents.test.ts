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

describe("withdrawing events entered in error", () => {
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

  const post = (client: Client, pathname: string, body?: unknown) =>
    fetch(`${client.base}${pathname}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: client.cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const ingest = (client: Client, uid: string, extra: Record<string, unknown> = {}, type = "ctDNA") =>
    post(client, "/ingest", {
      id: uid,
      fields: { Event_Type: type, Event_UID: uid, Master_ID: "M1", Event_Date: "2026-08-20", ...extra },
    });

  const get = (client: Client, pathname: string) => fetch(`${client.base}${pathname}`, { headers: { cookie: client.cookie } });
  const uids = async (client: Client, query = "masterId=M1") =>
    ((await (await get(client, `/query?${query}`)).json()).events as { uid: string }[]).map((e) => e.uid);

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "evp-withdraw-"));
    servers = [];
    const repository = new FileEventRepository(path.join(dir, "events.json"));
    admin = await start("administrator", null, repository);
    clinical = await start("clinical", null, repository);
    patient1 = await start("patient", "M1", repository);
    patient2 = await start("patient", "M2", repository);
    expect((await ingest(patient1, "A")).status).toBe(201);
    expect((await ingest(patient1, "B")).status).toBe(201);
  });

  afterEach(async () => {
    await Promise.all(servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("a withdrawn event leaves queries but is kept, with who withdrew it and why", async () => {
    const response = await post(patient1, "/B/withdraw", { reason: "  Duplicate of A  " });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ uid: "B", withdrawnByRole: "patient", withdrawnReason: "Duplicate of A", lastModifiedByRole: "patient" });
    expect(await uids(patient1)).toEqual(["A"]);
    expect(await uids(patient1, "masterId=M1&withdrawn=only")).toEqual(["B"]);
    expect((await (await get(patient1, "/B")).json()).withdrawnAt).toEqual(expect.any(String));
  });

  test("withdrawing and restoring are recorded in the history and nothing is lost", async () => {
    await post(patient1, "/B/withdraw");
    await post(patient1, "/B/restore");

    const versions = (await (await get(patient1, "/B/history")).json()).versions as { event: { withdrawnAt?: string } }[];
    expect(versions.map((v) => Boolean(v.event.withdrawnAt))).toEqual([false, true]);
    const restored = await (await get(patient1, "/B")).json();
    expect(restored.withdrawnAt).toBeUndefined();
    expect(restored.withdrawnReason).toBeUndefined();
    expect(await uids(patient1)).toEqual(["A", "B"]);
  });

  test("repeating a change that is already in effect adds no history", async () => {
    await post(patient1, "/B/withdraw");
    await post(patient1, "/B/withdraw", { reason: "again" });
    await post(patient1, "/A/restore");

    expect((await (await get(patient1, "/B/history")).json()).versions).toHaveLength(1);
    expect((await (await get(patient1, "/A/history")).json()).versions).toHaveLength(0);
  });

  test("an administrator may withdraw any patient's event; a clinical account may not", async () => {
    expect((await post(clinical, "/B/withdraw")).status).toBe(403);
    expect((await post(admin, "/B/withdraw")).status).toBe(200);
    expect((await post(clinical, "/B/restore")).status).toBe(403);
    expect((await get(clinical, "/B")).status).toBe(200);
  });

  test("another patient cannot withdraw or restore the event, and is told it does not exist", async () => {
    expect((await post(patient2, "/B/withdraw")).status).toBe(404);
    await post(patient1, "/B/withdraw");
    expect((await post(patient2, "/B/restore")).status).toBe(404);
    expect(await uids(patient1)).toEqual(["A"]);
  });

  test("an unknown event, a bad uid or a bad reason is refused", async () => {
    expect((await post(patient1, "/nope/withdraw")).status).toBe(404);
    expect((await post(patient1, "/bad%20uid/withdraw")).status).toBe(400);
    expect((await post(patient1, "/B/withdraw", { reason: 5 })).status).toBe(400);
    expect((await post(patient1, "/B/withdraw", { reason: "x".repeat(501) })).status).toBe(400);
    expect(await uids(patient1)).toEqual(["A", "B"]);
  });

  test("a withdrawn event cannot be edited, or newly linked to, until it is restored", async () => {
    await post(patient1, "/B/withdraw");

    expect((await ingest(patient1, "B", { Event_Date: "2026-08-21" })).status).toBe(409);
    const link = await ingest(patient1, "C", { Event_Related_UID: "B", Event_Relationship: "Related_To" }, "Recurrence");
    expect(link.status).toBe(422);

    await post(patient1, "/B/restore");
    expect((await ingest(patient1, "B", { Event_Date: "2026-08-21" })).status).toBe(200);
    expect((await ingest(patient1, "C", { Event_Related_UID: "B", Event_Relationship: "Related_To" }, "Recurrence")).status).toBe(201);
  });

  test("an invalid filter value is rejected", async () => {
    expect((await get(patient1, "/query?masterId=M1&withdrawn=all")).status).toBe(400);
  });
});
