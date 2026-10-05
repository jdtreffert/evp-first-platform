import { promises as fs } from "fs";
import path from "path";
import { DocumentRecord, DocumentStore, isDocumentId } from "./documentStore";

/**
 * Development storage on local disk. Each document is two files named by its generated id
 * (`<id>.bin` for the bytes, `<id>.json` for the metadata); the client-supplied name is
 * kept only as metadata. Files are created exclusively, so an existing document is never overwritten.
 */
export class FileDocumentStore implements DocumentStore {
  constructor(private readonly directory: string) {}

  async save(record: DocumentRecord, bytes: Buffer): Promise<void> {
    if (!isDocumentId(record.id)) throw new Error("Invalid document id");
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    await fs.writeFile(this.pathFor(record.id, "bin"), bytes, { flag: "wx", mode: 0o600 });
    await fs.writeFile(this.pathFor(record.id, "json"), JSON.stringify(record, null, 2), { flag: "wx", mode: 0o600 });
  }

  async getRecord(id: string): Promise<DocumentRecord | null> {
    if (!isDocumentId(id)) return null;
    try {
      return JSON.parse(await fs.readFile(this.pathFor(id, "json"), "utf8")) as DocumentRecord;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async read(id: string): Promise<Buffer | null> {
    if (!isDocumentId(id)) return null;
    try {
      return await fs.readFile(this.pathFor(id, "bin"));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  private pathFor(id: string, extension: "bin" | "json"): string {
    return path.join(this.directory, `${id}.${extension}`);
  }
}
