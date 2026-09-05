import { base, accountTableName } from './client';

export async function createAccountRecord(fields: any) {
  try {
    
    const payload = [{ fields }];
   
    const created = await base(accountTableName).create(payload);
    return created[0];
  } catch (error: any) {
    console.error("Airtable Account error (full object):", error);
    console.error("Airtable Account error JSON:", JSON.stringify(error, null, 2));
    throw new Error('Failed to create Account record');
  }
}

export async function updateAccountRecord(accountId: string, fields: any) {
  try {
    const updated = await base(accountTableName).update([
      {
        id: accountId,
        fields
      }
    ]);

    return updated[0];

  } catch (error: any) {
    console.error("Airtable Account update error:", error);
    throw new Error("Failed to update Account record");
  }
}