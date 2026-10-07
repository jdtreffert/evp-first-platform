import { EventRepository, SaveOptions, SaveResult } from "../persistence/eventRepository";
import { DocumentStore } from "../documents/documentStore";
import { UnifiedEvent } from "../types/UnifiedEvents";
import { HttpError } from "../utils/httpError";

export interface PersistOptions extends SaveOptions {
  /** When given, every attached document must exist and belong to the event's patient. */
  documents?: DocumentStore;
}

export async function persistEvent(
  repository: EventRepository,
  event: UnifiedEvent,
  options: PersistOptions = {},
): Promise<SaveResult> {
  const { documents, ...saveOptions } = options;
  if (documents) {
    for (const id of event.documentAttachment ?? []) {
      const record = await documents.getRecord(String(id));
      if (!record || record.masterId !== event.masterId) {
        throw new HttpError(422, "Document_Attachment refers to a document that does not exist for this patient");
      }
    }
  }
  if (event.relatedEventUid) {
    const related = await repository.getByUid(event.relatedEventUid);
    if (!related || related.masterId !== event.masterId) {
      throw new HttpError(422, "Event_Related_UID must refer to an existing event for the same patient");
    }
  }
  return repository.save(event, saveOptions);
}
