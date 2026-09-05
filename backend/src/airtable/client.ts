import dotenv from 'dotenv';
dotenv.config();

import Airtable from 'airtable';

const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
});

export const base = airtable.base(process.env.AIRTABLE_BASE_ID!);

export const masterTableName = process.env.AIRTABLE_MASTER_TABLE_NAME!;
export const accountTableName = process.env.AIRTABLE_ACCOUNT_TABLE_NAME!;
export const longitudinalEventsTableName = process.env.AIRTABLE_LONGITUDINAL_EVENTS_TABLE!;

// Export table clients (consistent pattern)
export const masterTable = base(masterTableName);
export const accountTable = base(accountTableName);
export const longitudinalEventsTable = base(longitudinalEventsTableName);
