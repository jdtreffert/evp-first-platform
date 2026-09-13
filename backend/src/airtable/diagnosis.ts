import { diagnosisTable } from './client';

export interface DiagnosisPayload {
  UID: string;                 // patient identity
  Master: string[];            // Airtable link field
  DiagnosisDate: string;
  Stage: string | null;
  VariantHistology: string[];  // multi-select
  Notes: string | null;
  CreatedAt: string;
}

export async function createDiagnosisRecord(
  uid: string,
  masterRecordId: string,
  payload: DiagnosisPayload
) {
  return diagnosisTable.create([
    {
      fields: {
        ...payload,
        UID: uid,
        Master: [masterRecordId],
      },
    },
  ]);
}

function safeParse(value: any): any {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function getDiagnosisRecords(masterRecordId: string) {
  try {
    const records = await diagnosisTable
      .select({
        sort: [{ field: 'DiagnosisDate', direction: 'asc' }],
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
      diagnosisDate: record.get('DiagnosisDate'),
      stage: record.get('Stage'),
      variantHistology: record.get('VariantHistology'),
      notes: record.get('Notes'),
      createdAt: record.get('CreatedAt'),
    }));
  } catch (error) {
    console.error("Error fetching diagnosis records:", error);
    throw error;
  }
}
