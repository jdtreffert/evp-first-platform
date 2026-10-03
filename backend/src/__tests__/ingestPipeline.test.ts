import { promises as fs } from "fs";
import { Server } from "http";
import { AddressInfo } from "net";
import os from "os";
import path from "path";
import { createApp } from "../app";
import { FileEventRepository } from "../persistence/fileEventRepository";

describe("ingestion pipeline (HTTP -> normalize -> validate -> persist)", () => {
  let dir: string;
  let file: string;
  let server: Server;
  let base: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "evp-pipeline-"));
    file = path.join(dir, "events.json");
    server = createApp({ repository: new FileEventRepository(file) }).listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/events`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await fs.rm(dir, { recursive: true, force: true });
  });

  const post = (route: string, body: string) =>
    fetch(`${base}${route}`, { method: "POST", headers: { "content-type": "application/json" }, body });

  const stored = async () => JSON.parse(await fs.readFile(file, "utf8")).events;

  const ctDNA = (value: number) =>
    JSON.stringify({
      id: "rec1",
      fields: { Event_Type: "ctDNA", Event_UID: "E1", Master_ID: "M1", Event_Date: "2024-03-01", ctDNA_Value: value },
    });

  test("stores a valid event, preserving a zero value", async () => {
    const res = await post("/ingest", ctDNA(0));

    expect(res.status).toBe(201);
    expect((await res.json()).ctDNAValue).toBe(0);
    expect(await stored()).toEqual([expect.objectContaining({ uid: "E1", ctDNAValue: 0 })]);
  });

  test("re-ingesting the same uid updates the stored event", async () => {
    await post("/ingest", ctDNA(1));
    const res = await post("/ingest", ctDNA(2));

    expect(res.status).toBe(200);
    expect(await stored()).toEqual([expect.objectContaining({ ctDNAValue: 2 })]);
  });

  test.each([
    ["unsupported type", { id: "r", fields: { Event_Type: "Nope", Master_ID: "M1" } }, 422],
    ["invalid date", { id: "r", fields: { Event_Type: "Note", Master_ID: "M1", Event_Date: "2024-02-30" } }, 422],
    ["missing master id", { id: "r", fields: { Event_Type: "Note" } }, 422],
    ["bad shape", { id: "r" }, 400],
  ])("rejects %s without writing anything", async (_label, body, status) => {
    const res = await post("/ingest", JSON.stringify(body));

    expect(res.status).toBe(status);
    await expect(fs.access(file)).rejects.toThrow();
  });

  test("malformed JSON returns 400 and writes nothing", async () => {
    const res = await post("/ingest", "{bad");

    expect(res.status).toBe(400);
    await expect(fs.access(file)).rejects.toThrow();
  });

  test("validate does not persist", async () => {
    const res = await post("/validate", JSON.stringify({ uid: "E1" }));

    expect(res.status).toBe(200);
    expect((await res.json()).valid).toBe(false);
    await expect(fs.access(file)).rejects.toThrow();
  });

  test("a storage failure returns 500 without leaking details", async () => {
    await fs.writeFile(file, "{corrupt", "utf8");
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const res = await post("/ingest", ctDNA(1));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
    expect(await fs.readFile(file, "utf8")).toBe("{corrupt");
    spy.mockRestore();
  });

  describe("query", () => {
    const get = (route: string) => fetch(`${base}${route}`);
    const ingest = (uid: string, masterId: string, date: string) =>
      post(
        "/ingest",
        JSON.stringify({ id: uid, fields: { Event_Type: "Note", Event_UID: uid, Master_ID: masterId, Event_Date: date } }),
      );

    beforeEach(async () => {
      await ingest("N1", "M1", "2024-01-01");
      await ingest("N2", "M2", "2024-02-01");
      await ingest("N3", "M1", "2024-03-01");
    });

    test("filters by patient, newest first", async () => {
      const res = await get("/query?masterId=M1&order=desc");
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.total).toBe(2);
      expect(body.events.map((e: { uid: string }) => e.uid)).toEqual(["N3", "N1"]);
    });

    test("filters by date range and paginates", async () => {
      const body = await (await get("/query?from=2024-01-15&limit=1")).json();

      expect(body.total).toBe(2);
      expect(body.events.map((e: { uid: string }) => e.uid)).toEqual(["N2"]);
    });

    test("returns an empty page when nothing matches", async () => {
      expect(await (await get("/query?masterId=NOPE")).json()).toMatchObject({ events: [], total: 0 });
    });

    test("an empty store queries cleanly", async () => {
      await fs.rm(file);
      expect(await (await get("/query")).json()).toMatchObject({ events: [], total: 0 });
    });

    test("rejects invalid or unknown parameters with 400 and details", async () => {
      const res = await get("/query?from=2024-02-30&bogus=1");
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Invalid query parameters");
      expect(body.details.length).toBeGreaterThan(0);
    });

    test("gets a single event by uid", async () => {
      const res = await get("/N2");

      expect(res.status).toBe(200);
      expect((await res.json()).masterId).toBe("M2");
    });

    test("unknown uid is 404 and a malformed uid is 400", async () => {
      expect((await get("/missing")).status).toBe(404);
      expect((await get("/bad%20uid")).status).toBe(400);
    });

    test("the query route is not shadowed by the uid route", async () => {
      expect((await get("/query")).status).toBe(200);
    });
  });
});
