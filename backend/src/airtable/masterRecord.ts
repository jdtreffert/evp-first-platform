import { base, masterTableName } from './client';

export async function createPatientRecord(fields: any) {
  try {
 
    const created = await base(masterTableName).create([{ fields }]);
    return created[0];
  } catch (error: any) {
    console.error('Airtable error:', error);
    throw new Error('Failed to create Airtable record');
  }
}

export async function updatePatientRecord(masterId: string, fields: any) {
  try {
    const updated = await base(masterTableName).update([
      {
        id: masterId,
        fields
      }
    ]);

    return updated[0];

  } catch (error: any) {
    console.error("Airtable Master update error:", error);
    throw new Error("Failed to update Master record");
  }
}