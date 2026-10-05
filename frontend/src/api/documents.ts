import { API_BASE, requestJson } from "./client";

export interface DocumentMeta {
  id: string;
  originalName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_TYPES = ["application/pdf", "image/png", "image/jpeg"];

export async function uploadDocument(file: File, masterId: string): Promise<DocumentMeta> {
  const query = new URLSearchParams({ masterId, filename: file.name });
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/documents?${query.toString()}`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/octet-stream" },
      body: file,
    });
  } catch {
    throw new Error("Unable to reach the server. Check your connection and try again.");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || `Document upload failed (${response.status})`);
  }
  return response.json() as Promise<DocumentMeta>;
}

export function getDocumentMeta(id: string): Promise<DocumentMeta> {
  return requestJson<DocumentMeta>(`/documents/${encodeURIComponent(id)}/meta`);
}

/** Fetches the file with the session cookie and opens it in a new tab, or downloads it if the tab is blocked. */
export async function openDocument(meta: DocumentMeta): Promise<void> {
  const tab = window.open("", "_blank");
  try {
    const response = await fetch(`${API_BASE}/documents/${encodeURIComponent(meta.id)}`, { credentials: "include" });
    if (!response.ok) throw new Error(`Unable to open the document (${response.status})`);
    const url = URL.createObjectURL(await response.blob());
    if (tab) {
      tab.location.href = url;
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = meta.originalName;
      link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}
