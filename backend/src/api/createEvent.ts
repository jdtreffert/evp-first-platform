import {base} from "../airtable/client"; // your Airtable client
import { LongitudinalEventsTable } from "../airtable/tables"; // your table name

export interface AirtableEventFields {
  EventSummary: string;
  EventType: string;
  EventCategory: string;
  EventDate: string;
  EventDetails: string;
  MasterId: string;
}

export async function createEvent(fields: AirtableEventFields) {
  const record = await base(LongitudinalEventsTable).create({ fields: fields as any });
  return record as any;
}






