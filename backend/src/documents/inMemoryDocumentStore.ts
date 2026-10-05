import { DocumentRecord, DocumentStore } from "./documentStore";

export class InMemoryDocumentStore implements DocumentStore {
  private readonly records = new Map<string, DocumentRecord>();
  private readonly contents = new Map<string, Buffer>();

  async save(record: DocumentRecord, bytes: Buffer): Promise<void> {
    if (this.records.has(record.id)) throw new Error("Document already exists");
    this.records.set(record.id, record);
    this.contents.set(record.id, bytes);
  }

  async getRecord(id: string): Promise<DocumentRecord | null> {
    return this.records.get(id) ?? null;
  }

  async read(id: string): Promise<Buffer | null> {
    return this.contents.get(id) ?? null;
  }
}
