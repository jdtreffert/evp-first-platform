import dotenv from 'dotenv';
dotenv.config();
const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
import { generateUID } from './uid';
import Airtable from 'airtable';

const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
const base = airtable.base(process.env.AIRTABLE_BASE_ID!);
const masterTableName = process.env.AIRTABLE_MASTER_TABLE_NAME!;
const accountTableName = process.env.AIRTABLE_ACCOUNT_TABLE_NAME!;

export async function createPatientRecord(fields: any) {
  try {
 
    const created = await base(masterTableName).create([{ fields }]);
    return created[0];
  } catch (error: any) {
    console.error('Airtable error:', error);
    throw new Error('Failed to create Airtable record');
  }
}

export async function createAccountRecord(fields: any) {
  try {
    console.log("Account fields being sent:", JSON.stringify(fields, null, 2));

    const payload = [{ fields }];
    console.log("Actual payload passed to Airtable SDK:", JSON.stringify(payload, null, 2));

    const created = await base(accountTableName).create(payload);
    return created[0];
  } catch (error: any) {
    console.error("Airtable Account error (full object):", error);
    console.error("Airtable Account error JSON:", JSON.stringify(error, null, 2));
    throw new Error('Failed to create Account record');
  }
}

export async function findOrCreateAccountAndMaster(email: string, firstName: string, lastName: string) {
  // 1. Lookup existing account
  const existing = await base(accountTableName).select({
    filterByFormula: `{Email} = "${email}"`
  }).firstPage();

  if (existing.length > 0) {
    const account = existing[0];
    const uid = account.get('UID');
    return { uid, accountId: account.id, created: false };
  }

  // 2. Generate UID
  const uid = generateUID();

  // 3. Create Master record
  const masterRecord = await createPatientRecord({
    UID: uid,
    CreatedAt: new Date().toISOString(),
    ConsentVersion: "v1"
  });

  // 4. Create Account record
  const accountRecord = await createAccountRecord({
    UID: uid,
    Email: email,
    FirstName: firstName,
    LastName: lastName,
    ConsentVersion: "v1",
    Status: "invited",
    CreatedAt: new Date().toISOString()
  });

  // 5. Return mapping
  return {
    uid,
    accountId: accountRecord.id,
    masterId: masterRecord.id,
    created: true
  };
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

const allowedTransitions: Record<string, string[]> = {
  invited: ["pending", "paused", "withdrawn"],
  pending: ["registered", "paused", "withdrawn"],
  registered: ["verified", "paused", "withdrawn"],
  verified: ["completed", "paused", "withdrawn"],
  completed: ["active", "paused", "withdrawn"],
  active: ["reengaged", "paused", "withdrawn"],
  reengaged: ["active", "paused", "withdrawn"],
  paused: ["pending", "withdrawn"],
  withdrawn: [] // terminal state
};

export async function updateOnboardingStatus(accountId: string, newStatus: string) {
  const record = await base('Account').find(accountId);
  const currentStatus = record.get("Status");

  const allowed = allowedTransitions[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid onboarding transition: ${currentStatus} → ${newStatus}`
    );
  }

  const updated = await base('Account').update([
    {
      id: accountId,
      fields: { Status: newStatus }
    }
  ]);

  return updated[0];
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
export async function createPatientFormRecord(data: any) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  const airtableFields = {
    "FirstName": data.firstName,
    "LastName": data.lastName,
    "Email": data.email,
  };

  const response = await fetch(`https://api.airtable.com/v0/${baseId}/Account`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fields: airtableFields })
  });

  const json = await response.json();

  if (!response.ok) {
    console.error("Airtable error:", json);
    throw new Error(json.error?.message || "Failed to create Patient record");
  }

  return json;
}









