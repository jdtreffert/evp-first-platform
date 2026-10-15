import { Encounter } from "../types/Encounter";
import { HttpError } from "../utils/httpError";

export interface EncounterSaveOptions {
  /** Set for patients: they may only write encounters for their own record. */
  ownerMasterId?: string;
  /** Role of the account saving the encounter, recorded for provenance. */
  actorRole?: string;
}

/** A superseded version of an encounter, kept when the encounter is replaced. */
export interface EncounterVersion {
  encounter: Encounter;
  supersededAt: string;
  supersededByRole: string;
}

export interface EncounterSaveResult {
  created: boolean;
  /** The encounter as stored, including the provenance the server stamped. */
  encounter: Encounter;
}

export interface EncounterQuery {
  masterId?: string;
  order: "asc" | "desc";
  limit: number;
  offset: number;
}

export interface EncounterQueryResult {
  encounters: Encounter[];
  /** Number of encounters matching the filters, before pagination. */
  total: number;
  limit: number;
  offset: number;
}

/**
 * Storage for Encounters. `uid` is the identity: saving an existing uid replaces the stored encounter and
 * keeps the previous version in its history. There is no delete.
 */
export interface EncounterRepository {
  save(encounter: Encounter, options?: EncounterSaveOptions): Promise<EncounterSaveResult>;
  getByUid(uid: string): Promise<Encounter | null>;
  /** Earlier versions of an encounter, oldest first. Versions are never removed. */
  history(uid: string): Promise<EncounterVersion[]>;
  query(query: EncounterQuery): Promise<EncounterQueryResult>;
}

/**
 * Ownership checks and provenance stamping shared by every repository implementation. recordedAt is when
 * the encounter first entered the repository and is kept across replacements.
 */
export function prepareSave(
  existing: Encounter | undefined,
  incoming: Encounter,
  options: EncounterSaveOptions,
  now: string = new Date().toISOString(),
): { saved: Encounter; superseded?: EncounterVersion } {
  if (options.ownerMasterId !== undefined) {
    if (incoming.masterId !== options.ownerMasterId) {
      throw new HttpError(403, "Patients may only write encounters for their own patient record");
    }
    if (existing && existing.masterId !== options.ownerMasterId) {
      throw new HttpError(403, "Patients may not replace another patient's encounter");
    }
  } else if (existing && existing.masterId !== incoming.masterId) {
    throw new HttpError(422, "An encounter cannot be moved to a different patient record");
  }

  const role = options.actorRole ?? "system";
  if (!existing) {
    return { saved: { ...incoming, recordedAt: now, recordedByRole: role } };
  }
  return {
    saved: {
      ...incoming,
      recordedAt: existing.recordedAt ?? now,
      recordedByRole: existing.recordedByRole ?? role,
      lastModifiedAt: now,
      lastModifiedByRole: role,
    },
    superseded: { encounter: existing, supersededAt: now, supersededByRole: role },
  };
}

function dateKey(encounter: Encounter): number {
  const time = Date.parse(encounter.encounterDate);
  return Number.isNaN(time) ? 0 : time;
}

/** Filters, orders by encounter date (ties broken by uid) and paginates. */
export function applyEncounterQuery(encounters: Encounter[], query: EncounterQuery): EncounterQueryResult {
  const direction = query.order === "asc" ? 1 : -1;
  const filtered = encounters
    .filter((e) => query.masterId === undefined || e.masterId === query.masterId)
    .sort((a, b) => {
      const byDate = (dateKey(a) - dateKey(b)) * direction;
      if (byDate !== 0) return byDate;
      return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
    });
  return {
    encounters: filtered.slice(query.offset, query.offset + query.limit),
    total: filtered.length,
    limit: query.limit,
    offset: query.offset,
  };
}
