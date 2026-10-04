import { promises as fs } from "fs";
import { Server } from "http";
import { AddressInfo } from "net";
import os from "os";
import path from "path";
import { FileEventRepository } from "../persistence/fileEventRepository";
import { createAuthenticatedTestApp } from "./testAuth";

describe("query API (HTTP)", () => {
  let dir: string;
  let server: Server;
  let base: string;
  let cookie: string;

  const ingest = (type: string, uid: string, master: string, date: string) =>
    fetch(`${base}/ingest`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({
        id: uid,
        fields: { Event_Type: type, Event_UID: uid, Master_ID: master, Event_Date: date },
      }),
    });

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "evp-query-"));
    const fixture = await createAuthenticatedTestApp(
      new FileEventRepository(path.join(dir, "events.json")),
    );
    server = fixture.app.listen(0);
    cookie = fixture.cookie;
    await new Promise<void>((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/events`;

    await ingest("Note", "N1", "M1", "2024-03-01");
    await ingest("Lab", "L1", "M1", "2024-01-10");
    await ingest("Note", "N2", "M2", "2024-02-01");
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("GET /query filters, orders and paginates", async () => {
    const res = await fetch(`${base}/query?masterId=M1`, { headers: { cookie } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(2);
    expect(body.events.map((e: { uid: string }) => e.uid)).toEqual(["L1", "N1"]);

    const ranged = await (await fetch(`${base}/query?from=2024-02-01&to=2024-03-01&limit=1`, { headers: { cookie } })).json();
    expect(ranged.total).toBe(2);
    expect(ranged.events.map((e: { uid: string }) => e.uid)).toEqual(["N2"]);
  });

  test("GET /query with bad parameters returns 400 with details", async () => {
    const res = await fetch(`${base}/query?limit=0&masterId=a&masterId=b`, { headers: { cookie } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid query parameters");
    expect(body.details.length).toBeGreaterThan(0);
  });

  test("GET /:uid returns the event, 404 when unknown", async () => {
    const found = await fetch(`${base}/N2`, { headers: { cookie } });
    expect(found.status).toBe(200);
    expect((await found.json()).masterId).toBe("M2");

    const missing = await fetch(`${base}/nope`, { headers: { cookie } });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Event not found" });
  });

  test("'query' is routed as the query endpoint, not as a uid", async () => {
    const body = await (await fetch(`${base}/query`, { headers: { cookie } })).json();
    expect(body.total).toBe(3);
  });

  test("ingested events are immediately queryable by type", async () => {
    const body = await (await fetch(`${base}/query?eventType=Lab`, { headers: { cookie } })).json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].uid).toBe("L1");
  });
});
