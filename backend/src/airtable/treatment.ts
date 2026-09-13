import { treatmentTable } from './client';

export interface TreatmentPayload {
  UID: string;                 // patient identity
  Master: string[];            // Airtable link field
  TreatmentDate: string;
  TreatmentType: string;
  MedicationName?: string | null;
  Dosage?: string | null;
  Provider?: string | null;
  Notes?: string | null;
  CreatedAt: string;
}

export async function createTreatmentRecord(
  uid: string,
  masterRecordId: string,
  payload: TreatmentPayload
) {
  return treatmentTable.create([
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

export async function getTreatmentRecords(masterRecordId: string) {
  try {
    const records = await treatmentTable
      .select({
        sort: [{ field: 'TreatmentDate', direction: 'asc' }],
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
      treatmentDate: record.get('TreatmentDate'),
      treatmentType: record.get('TreatmentType'),
      medicationName: record.get('MedicationName'),
      dosage: record.get('Dosage'),
      provider: record.get('Provider'),
      notes: record.get('Notes'),
      createdAt: record.get('CreatedAt'),
    }));
  } catch (error) {
    console.error("Error fetching treatment records:", error);
    throw error;
  }
}
