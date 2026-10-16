import { EventRepository } from "../persistence/eventRepository";
import { UnifiedEvent } from "../types/UnifiedEvents";
import { HttpError } from "../utils/httpError";
import { isValidUid } from "../validation/fieldValidators";
import { getEventByUid } from "./queryService";

export const MAX_WITHDRAWAL_REASON_LENGTH = 500;

export interface WithdrawalActor {
  /** Set for patient accounts, which may only change events in their own record. */
  ownerMasterId?: string;
  actorRole?: string;
}

/** Withdraws an event as entered in error. The event and its history are kept; queries leave it out. */
export async function withdrawEvent(
  repository: EventRepository,
  uid: string,
  rawReason: unknown,
  actor: WithdrawalActor,
): Promise<UnifiedEvent> {
  if (rawReason !== undefined && rawReason !== null && typeof rawReason !== "string") {
    throw new HttpError(400, "reason must be text");
  }
  const reason = typeof rawReason === "string" && rawReason.trim() !== "" ? rawReason.trim() : null;
  if (reason !== null && reason.length > MAX_WITHDRAWAL_REASON_LENGTH) {
    throw new HttpError(400, `reason must be at most ${MAX_WITHDRAWAL_REASON_LENGTH} characters`);
  }
  return change(repository, uid, true, reason, actor);
}

/** Restores a withdrawn event so queries include it again. */
export function restoreEvent(repository: EventRepository, uid: string, actor: WithdrawalActor): Promise<UnifiedEvent> {
  return change(repository, uid, false, null, actor);
}

async function change(
  repository: EventRepository,
  uid: string,
  withdrawn: boolean,
  reason: string | null,
  actor: WithdrawalActor,
): Promise<UnifiedEvent> {
  if (!isValidUid(uid)) throw new HttpError(400, "Invalid uid");
  const existing = await getEventByUid(repository, uid);
  // A patient is told nothing about events in other records.
  if (actor.ownerMasterId !== undefined && existing.masterId !== actor.ownerMasterId) {
    throw new HttpError(404, "Event not found");
  }
  const changed = await repository.setWithdrawn(uid, withdrawn, { ...actor, reason });
  if (!changed) throw new HttpError(404, "Event not found");
  return changed;
}
