import { EventRepository, SaveOptions, SaveResult } from "../persistence/eventRepository";
import { DocumentStore } from "../documents/documentStore";
import { assertDocumentsBelongToPatient } from "../documents/documentLinks";
import { EncounterRepository } from "../encounters/encounterRepository";
import { isWithdrawn } from "../persistence/withdrawal";
import { UnifiedEvent } from "../types/UnifiedEvents";
import { HttpError } from "../utils/httpError";

export interface PersistOptions extends SaveOptions {
  /** When given, every attached document must exist and belong to the event's patient. */
  documents?: DocumentStore;
  /** When given, Encounter_UID must refer to an existing encounter for the event's patient. */
  encounters?: EncounterRepository;
}

export async function persistEvent(
  repository: EventRepository,
  event: UnifiedEvent,
  options: PersistOptions = {},
): Promise<SaveResult> {
  const { documents, encounters, ...saveOptions } = options;
  if (documents) {
    await assertDocumentsBelongToPatient(documents, event.documentAttachment ?? [], event.masterId);
  }
  const existing = await repository.getByUid(event.uid);
  if (existing && isWithdrawn(existing)) {
    throw new HttpError(409, "This event has been withdrawn; restore it before editing");
  }
  // Patients replacing someone else's event are refused by the repository with a 403.
  if (existing && existing.masterId !== event.masterId && saveOptions.ownerMasterId === undefined) {
    throw new HttpError(422, "An event cannot be moved to a different patient record");
  }
  if (event.relatedEventUid === event.uid) {
    throw new HttpError(422, "An event cannot be related to itself");
  }
  if (event.relatedEventUid) {
    const related = await repository.getByUid(event.relatedEventUid);
    if (!related || related.masterId !== event.masterId) {
      throw new HttpError(422, "Event_Related_UID must refer to an existing event for the same patient");
    }
    if (isWithdrawn(related)) {
      throw new HttpError(422, "Event_Related_UID refers to an event that has been withdrawn");
    }
  }
  if (event.encounterUid && encounters) {
    const encounter = await encounters.getByUid(event.encounterUid);
    if (!encounter || encounter.masterId !== event.masterId) {
      throw new HttpError(422, "Encounter_UID must refer to an existing encounter for the same patient");
    }
  }
  return repository.save(event, saveOptions);
}
