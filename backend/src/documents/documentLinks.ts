import { HttpError } from "../utils/httpError";
import { DocumentStore } from "./documentStore";

/**
 * Rejects (422) unless every id names an existing document that belongs to the given patient. Used by
 * everything that can hold Document_Attachment, so a record can never point at another patient's file.
 */
export async function assertDocumentsBelongToPatient(
  documents: DocumentStore,
  ids: readonly unknown[],
  masterId: string,
): Promise<void> {
  for (const id of ids) {
    const record = await documents.getRecord(String(id));
    if (!record || record.masterId !== masterId) {
      throw new HttpError(422, "Document_Attachment refers to a document that does not exist for this patient");
    }
  }
}
