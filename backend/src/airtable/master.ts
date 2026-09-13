import { base, masterTableName } from './client';

export interface MasterPayload {
  UID: string;                 // canonical patient identity
  ConsentVersion: string;
  CreatedAt: string;
  FirstName?: string | null;
  LastName?: string | null;
  Email?: string | null;
  Notes?: string | null;
}

export async function createMasterRecord(payload: MasterPayload) {
  try {
    const created = await base(masterTableName).create([
      {
        fields: {
          ...payload,
          UID: payload.UID,
          CreatedAt: payload.CreatedAt || new Date().toISOString(),
        },
      },
    ]);

    return created[0];
  } catch (error: any) {
    console.error('Airtable Master create error:', error);
    throw new Error('Failed to create Master record');
  }
}

export async function updateMasterRecord(masterId: string, fields: Partial<MasterPayload>) {
  try {
    const updated = await base(masterTableName).update([
      {
        id: masterId,
        fields,
      },
    ]);

    return updated[0];
  } catch (error: any) {
    console.error('Airtable Master update error:', error);
    throw new Error('Failed to update Master record');
  }
}

export async function getMasterRecord(masterId: string) {
  try {
    return await base(masterTableName).find(masterId);
  } catch (error: any) {
    console.error('Airtable Master fetch error:', error);
    throw new Error('Failed to fetch Master record');
  }
}

export async function getMasterRecordByUID(uid: string) {
  try {
    const records = await base(masterTableName)
      .select({
        filterByFormula: `{UID} = "${uid}"`,
        maxRecords: 1,
      })
      .firstPage();

    return records.length > 0 ? records[0] : null;
  } catch (error: any) {
    console.error('Airtable Master fetch-by-UID error:', error);
    throw new Error('Failed to fetch Master record by UID');
  }
}
