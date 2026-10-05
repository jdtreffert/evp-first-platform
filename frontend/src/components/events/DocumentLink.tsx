import { useEffect, useState } from "react";
import { getDocumentMeta, openDocument } from "../../api/documents";
import type { DocumentMeta } from "../../api/documents";

export default function DocumentLink({ documentId }: { documentId: string }) {
  const [meta, setMeta] = useState<DocumentMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDocumentMeta(documentId)
      .then((value) => { if (active) setMeta(value); })
      .catch(() => { if (active) setError("Document unavailable"); });
    return () => { active = false; };
  }, [documentId]);

  if (error) return <p className="mt-1 text-xs text-gray-500">{error}</p>;
  if (!meta) return null;

  return (
    <button
      type="button"
      className="mt-1 block text-sm text-blue-300 underline"
      onClick={() => void openDocument(meta).catch((openError: unknown) => {
        setError(openError instanceof Error ? openError.message : "Unable to open the document");
      })}
    >
      View document: {meta.originalName}
    </button>
  );
}
