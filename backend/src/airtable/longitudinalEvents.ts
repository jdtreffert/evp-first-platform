import { longitudinalEventsTable } from './client';

export interface Attachment {
  url: string;
}

export interface EventDetails {
  findings?: string;
  notes?: string;
  provider?: string;
  location?: string;
}

export interface EventPayload {
  UID: string;                     // patient identity
  Master: string[];                // Airtable link field
  EventType: string;
  EventDate: string;
  EventSummary: string;
  EventDetails: string | null;     // JSON string
  SourceDocumentURL: string | null;
  EventAttachments: Attachment[];
  CreatedAt: string;
}

export async function createLongitudinalEvent(
  uid: string,
  masterRecordId: string,
  payload: EventPayload
) {
  return longitudinalEventsTable.create([
    {
      fields: {
        ...payload,
        UID: uid,
        Master: [masterRecordId],
      },
    },
  ]);
}

function safeParse(value: any): EventDetails | any {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function getLongitudinalEvents(masterRecordId: string) {
  try {
    const records = await longitudinalEventsTable
      .select({
        sort: [{ field: 'EventDate', direction: 'asc' }],
      })
      .all();

    const filtered = records.filter(record => {
      const ids = record.get('Master') as string[] | undefined;
      return ids?.includes(masterRecordId);
    });

    return filtered.map((record) => ({
      id: record.id,
      uid: record.get('UID'),
      master: record.get('Master'),
      eventType: record.get('EventType'),
      eventDate: record.get('EventDate'),
      eventSummary: record.get('EventSummary'),
      eventDetails: safeParse(record.get('EventDetails')),
      sourceDocumentURL: record.get('SourceDocumentURL'),
      createdAt: record.get('CreatedAt'),
    }));
  } catch (error) {
    console.error("Error fetching longitudinal events:", error);
    throw error;
  }
}
