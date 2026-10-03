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
});
