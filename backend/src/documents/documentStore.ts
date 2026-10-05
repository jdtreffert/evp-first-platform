export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export interface DocumentRecord {
  id: string;
  masterId: string;
  originalName: string;
  contentType: string;
  size: number;
  sha256: string;
  uploadedByRole: string;
  uploadedAt: string;
}

/**
 * Storage for uploaded documents. Documents are immutable: there is no update or delete,
 * and a replacement is a new document with a new id.
 */
export interface DocumentStore {
  save(record: DocumentRecord, bytes: Buffer): Promise<void>;
  getRecord(id: string): Promise<DocumentRecord | null>;
  read(id: string): Promise<Buffer | null>;
}

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDocumentId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}
