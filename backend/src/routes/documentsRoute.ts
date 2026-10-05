import { createHash, randomUUID } from "crypto";
import express, { Request, Response, Router } from "express";
import { AuthService } from "../auth/authService";
import { createRequireAuth, requireRoles } from "../auth/authMiddleware";
import { MAX_DOCUMENT_BYTES, DocumentRecord, DocumentStore, isDocumentId } from "../documents/documentStore";
import { detectDocumentType } from "../documents/fileType";
import { HttpError } from "../utils/httpError";

const MAX_NAME_LENGTH = 200;

function cleanFileName(value: unknown): string {
  const name = typeof value === "string" ? value : "";
  // Keep only the final path segment and drop control characters.
  const cleaned = name.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, MAX_NAME_LENGTH);
  return cleaned || "document";
}

function publicView(record: DocumentRecord) {
  return {
    id: record.id,
    originalName: record.originalName,
    contentType: record.contentType,
    size: record.size,
    uploadedAt: record.uploadedAt,
  };
}

export function createDocumentsRouter(store: DocumentStore, auth: AuthService): Router {
  const router = Router();
  const requireAuth = createRequireAuth(auth);

  /** Patients only ever see their own documents; anything else looks like it does not exist. */
  async function loadVisibleRecord(req: Request): Promise<DocumentRecord> {
    const id = String(req.params.id);
    const record = isDocumentId(id) ? await store.getRecord(id) : null;
    if (!record || (req.authUser?.role === "patient" && record.masterId !== req.authUser.masterId)) {
      throw new HttpError(404, "Document not found");
    }
    return record;
  }

  router.post(
    "/",
    requireAuth,
    requireRoles("administrator", "patient"),
    express.raw({ type: "application/octet-stream", limit: MAX_DOCUMENT_BYTES }),
    async (req: Request, res: Response) => {
      const patient = req.authUser?.role === "patient";
      const masterId = patient ? req.authUser?.masterId : req.query.masterId;
      if (typeof masterId !== "string" || masterId.trim() === "" || masterId.length > 100) {
        throw new HttpError(400, "masterId is required");
      }
      const bytes = req.body as unknown;
      if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
        throw new HttpError(400, "Send the file as an application/octet-stream request body");
      }
      const contentType = detectDocumentType(bytes);
      if (!contentType) {
        throw new HttpError(415, "Unsupported file type: only PDF, PNG and JPEG documents are accepted");
      }

      const record: DocumentRecord = {
        id: randomUUID(),
        masterId: masterId.trim(),
        originalName: cleanFileName(req.query.filename),
        contentType,
        size: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        uploadedByRole: req.authUser!.role,
        uploadedAt: new Date().toISOString(),
      };
      await store.save(record, bytes);
      res.status(201).json(publicView(record));
    },
  );

  router.get("/:id/meta", requireAuth, async (req: Request, res: Response) => {
    res.status(200).json(publicView(await loadVisibleRecord(req)));
  });

  router.get("/:id", requireAuth, async (req: Request, res: Response) => {
    const record = await loadVisibleRecord(req);
    const bytes = await store.read(record.id);
    if (!bytes) throw new HttpError(404, "Document not found");

    const asciiName = record.originalName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
    res.set({
      "Content-Type": record.contentType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(record.originalName)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
    });
    res.status(200).send(bytes);
  });

  return router;
}
