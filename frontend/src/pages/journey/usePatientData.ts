import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Encounter } from "../../../../backend/src/types/Encounter";
import type { UnifiedEvent } from "../../../../backend/src/types/UnifiedEvents";
import { listEncounters } from "../../api/encounters";
import { queryAllEvents } from "../../api/events";
import { useAuth } from "../../auth/useAuth";

export interface PatientData {
  events: UnifiedEvent[];
  encounters: Encounter[];
}

interface Loaded {
  masterId: string;
  data: PatientData | null;
  error: string | null;
}

/**
 * Which patient record a journey view shows, and that patient's events and encounters. A patient account is
 * confined to its own record; other roles enter a patient ID. Encounters that fail to load do not stop the
 * events from showing.
 */
export function usePatientData() {
  const { user } = useAuth();
  const isPatient = user?.role === "patient";
  const [searchMasterId, setSearchMasterId] = useState(user?.masterId ?? "");
  const [activeMasterId, setActiveMasterId] = useState(isPatient ? user?.masterId ?? "" : "");
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!activeMasterId) return;
    let active = true;
    Promise.all([queryAllEvents(activeMasterId), listEncounters(activeMasterId).catch(() => [] as Encounter[])])
      .then(([events, encounters]) => { if (active) setLoaded({ masterId: activeMasterId, data: { events, encounters }, error: null }); })
      .catch((loadError: unknown) => {
        if (active) {
          setLoaded({
            masterId: activeMasterId,
            data: null,
            error: loadError instanceof Error ? loadError.message : "Unable to load events.",
          });
        }
      });
    return () => { active = false; };
  }, [activeMasterId]);

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveMasterId(searchMasterId.trim());
  };

  return {
    isPatient,
    searchMasterId,
    setSearchMasterId,
    activeMasterId,
    /** The data for the active patient; null while it is loading. */
    current: loaded && loaded.masterId === activeMasterId ? loaded : null,
    search,
  };
}
