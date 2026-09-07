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
  EventType: string;
  EventDate: string;
  EventSummary: string;
  EventDetails: string | null;
  SourceDocumentURL: string | null;
  EventAttachments: Attachment[];
  MasterId: string[];
  CreatedAt: string;
}


export async function createLongitudinalEvent(masterId: string, payload: EventPayload) {
  return longitudinalEventsTable.create([
    {
      fields: payload as any
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

export async function getLongitudinalEvents(masterId: string) {
  try {
    // Fetch all records without Airtable filter
    const records = await longitudinalEventsTable
      .select({
        sort: [{ field: 'EventDate', direction: 'asc' }],
      })
      .all();

    console.log("Fetched records:", records.map(r => r.fields));

    // Filter in code: MasterId is an array of linked record IDs
    const filtered = records.filter(record => {
      const ids = record.get('MasterId') as string[] | undefined;
      return ids?.includes(masterId);
    });

    return filtered.map((record) => ({
      id: record.id,
      masterId: record.get('MasterId'),
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
