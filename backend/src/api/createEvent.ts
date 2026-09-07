import base from "./airtableClient"; // your Airtable client
import { LongitudinalEventsTable } from "./tables"; // your table name

export async function createEvent(fields: any) {
  const result = await base(LongitudinalEventsTable).create([
    { fields }
  ]);

  return result[0];
}
