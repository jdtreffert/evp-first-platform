export type DocumentContentType = "application/pdf" | "image/png" | "image/jpeg";

/** Identifies the file by its leading bytes; the client-supplied name and type are never trusted. */
export function detectDocumentType(bytes: Buffer): DocumentContentType | null {
  if (bytes.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}
