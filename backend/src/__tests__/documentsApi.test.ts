import { promises as fs } from "fs";
import { Server } from "http";
import { AddressInfo } from "net";
import os from "os";
import path from "path";
import { FileDocumentStore } from "../documents/fileDocumentStore";
import { MAX_DOCUMENT_BYTES } from "../documents/documentStore";
import { FileEventRepository } from "../persistence/fileEventRepository";
import { UserRole } from "../auth/authTypes";
import { createAuthenticatedTestApp } from "./testAuth";

const PDF = Buffer.from("%PDF-1.7\n%test document\n");
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("rest")]);

interface Client {
  base: string;
  cookie: string;
}

describe("documents API (HTTP)", () => {
  let dir: string;
  let servers: Server[];
  let admin: Client;
  let clinical: Client;
  let patient1: Client;
  let patient2: Client;

  async function start(role: UserRole, masterId: string | null, repository: FileEventRepository, documents: FileDocumentStore): Promise<Client> {
    const fixture = await createAuthenticatedTestApp(repository, role, masterId, documents);
    const server = fixture.app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    servers.push(server);
    return { base: `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`, cookie: fixture.cookie };
  }

  const upload = (client: Client, bytes: Buffer | string, query = "", type = "application/octet-stream") =>
    fetch(`${client.base}/documents${query}`, {
      method: "POST",
      headers: { "content-type": type, cookie: client.cookie },
      body: new Uint8Array(typeof bytes === "string" ? Buffer.from(bytes) : bytes),
    });

  const ingest = (client: Client, fields: Record<string, unknown>) =>
    fetch(`${client.base}/events/ingest`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: client.cookie },
      body: JSON.stringify({ id: String(fields.Event_UID), fields: { Event_Type: "Note", Event_Date: "2026-01-02", ...fields } }),
    });

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "evp-docs-"));
    servers = [];
    const repository = new FileEventRepository(path.join(dir, "events.json"));
    const documents = new FileDocumentStore(path.join(dir, "documents"));
    admin = await start("administrator", null, repository, documents);
    clinical = await start("clinical", null, repository, documents);
    patient1 = await start("patient", "M1", repository, documents);
    patient2 = await start("patient", "M2", repository, documents);
  });

  afterEach(async () => {
    await Promise.all(servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
    await fs.rm(dir, { recursive: true, force: true });
  });

  test("an administrator uploads a PDF for a patient and downloads identical bytes", async () => {
    const res = await upload(admin, PDF, "?masterId=M1&filename=path.pdf");
    const meta = await res.json();

    expect(res.status).toBe(201);
    expect(meta).toMatchObject({ originalName: "path.pdf", contentType: "application/pdf", size: PDF.length });
    expect(meta).not.toHaveProperty("sha256");

    const download = await fetch(`${admin.base}/documents/${meta.id}`, { headers: { cookie: admin.cookie } });
    expect(download.status).toBe(200);
    expect(download.headers.get("content-type")).toBe("application/pdf");
    expect(download.headers.get("x-content-type-options")).toBe("nosniff");
    expect(download.headers.get("content-disposition")).toContain("attachment");
    expect(Buffer.from(await download.arrayBuffer()).equals(PDF)).toBe(true);
  });

  test("files are stored under generated names, not the client-supplied name", async () => {
    const meta = await (await upload(admin, PDF, `?masterId=M1&filename=${encodeURIComponent("../../etc/passwd.pdf")}`)).json();
    expect(meta.originalName).toBe("passwd.pdf");

    const stored = await fs.readdir(path.join(dir, "documents"));
    expect(stored.sort()).toEqual([`${meta.id}.bin`, `${meta.id}.json`]);
  });

  test("the file type comes from the content, not the declared name", async () => {
    const res = await upload(admin, "plain text pretending to be a pdf", "?masterId=M1&filename=fake.pdf");
    expect(res.status).toBe(415);

    const png = await upload(admin, PNG, "?masterId=M1&filename=scan.pdf");
    expect((await png.json()).contentType).toBe("image/png");
  });

  test("rejects an empty body, a missing masterId and a non-binary content type", async () => {
    expect((await upload(admin, Buffer.alloc(0), "?masterId=M1")).status).toBe(400);
    expect((await upload(admin, PDF)).status).toBe(400);
    expect((await upload(admin, PDF, "?masterId=M1", "application/json")).status).toBe(400);
  });

  test("rejects files over the size limit", async () => {
    const big = Buffer.concat([PDF, Buffer.alloc(MAX_DOCUMENT_BYTES)]);
    expect((await upload(admin, big, "?masterId=M1")).status).toBe(413);
  });

  test("a patient uploads only to their own record, whatever masterId they send", async () => {
    const meta = await (await upload(patient1, PDF, "?masterId=M2&filename=mine.pdf")).json();

    const own = await fetch(`${patient1.base}/documents/${meta.id}`, { headers: { cookie: patient1.cookie } });
    expect(own.status).toBe(200);
    const other = await fetch(`${patient2.base}/documents/${meta.id}`, { headers: { cookie: patient2.cookie } });
    expect(other.status).toBe(404);
  });

  test("a patient cannot read another patient's document or its metadata", async () => {
    const meta = await (await upload(admin, PDF, "?masterId=M1")).json();

    expect((await fetch(`${patient2.base}/documents/${meta.id}`, { headers: { cookie: patient2.cookie } })).status).toBe(404);
    expect((await fetch(`${patient2.base}/documents/${meta.id}/meta`, { headers: { cookie: patient2.cookie } })).status).toBe(404);
    expect((await fetch(`${patient1.base}/documents/${meta.id}/meta`, { headers: { cookie: patient1.cookie } })).status).toBe(200);
  });

  test("clinical accounts can read any document but cannot upload", async () => {
    const meta = await (await upload(admin, PDF, "?masterId=M1")).json();

    expect((await fetch(`${clinical.base}/documents/${meta.id}`, { headers: { cookie: clinical.cookie } })).status).toBe(200);
    expect((await upload(clinical, PDF, "?masterId=M1")).status).toBe(403);
  });

  test("requires authentication and rejects malformed ids", async () => {
    expect((await fetch(`${admin.base}/documents`, { method: "POST", body: PDF, headers: { "content-type": "application/octet-stream" } })).status).toBe(401);
    expect((await fetch(`${admin.base}/documents/not-an-id`, { headers: { cookie: admin.cookie } })).status).toBe(404);
    expect((await fetch(`${admin.base}/documents/..%2F..%2Fevents.json`, { headers: { cookie: admin.cookie } })).status).toBe(404);
  });

  test("an event may link a document that exists for the same patient", async () => {
    const meta = await (await upload(patient1, PDF)).json();

    const res = await ingest(patient1, {
      Event_UID: "E1", Master_ID: "M1", Event_Details: "x", Document_Attachment: [meta.id], Document_Type: "Pathology",
    });
    expect(res.status).toBe(201);
    expect((await res.json()).documentAttachment).toEqual([meta.id]);
  });

  test("an event cannot link a missing document or another patient's document", async () => {
    const other = await (await upload(patient2, PDF)).json();

    const missing = await ingest(patient1, { Event_UID: "E2", Master_ID: "M1", Event_Details: "x", Document_Attachment: ["11111111-1111-4111-8111-111111111111"] });
    const foreign = await ingest(patient1, { Event_UID: "E3", Master_ID: "M1", Event_Details: "x", Document_Attachment: [other.id] });
    const malformed = await ingest(patient1, { Event_UID: "E4", Master_ID: "M1", Event_Details: "x", Document_Attachment: "oops" });

    expect(missing.status).toBe(422);
    expect(foreign.status).toBe(422);
    expect(malformed.status).toBe(422);
  });
});
