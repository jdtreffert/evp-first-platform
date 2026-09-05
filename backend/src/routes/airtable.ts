import { base, accountTableName } from '../airtable/client';
import { createPatientRecord } from '../airtable/masterRecord';
import { createAccountRecord } from '../airtable/account';
import { generateUID } from './uid';

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



const allowedTransitions: Record<string, string[]> = {
  invited: ["pending", "paused", "withdrawn"],
  pending: ["registered", "paused", "withdrawn"],
  registered: ["verified", "paused", "withdrawn"],
  verified: ["completed", "paused", "withdrawn"],
  completed: ["active", "paused", "withdrawn"],
  active: ["reengaged", "paused", "withdrawn"],
  reengaged: ["active", "paused", "withdrawn"],
  paused: ["pending", "withdrawn"],
  withdrawn: []
};

export async function updateOnboardingStatus(accountId: string, newStatus: string) {
  const record = await base(accountTableName).find(accountId);

  // Read the current status from Airtable
  const currentStatus = record.get("Status");

  // Force it to a string so TS can index safely
  const status = String(currentStatus);

  // Lookup allowed transitions
  const allowed = allowedTransitions[status] || [];

  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid onboarding transition: ${currentStatus} → ${newStatus}`);
  }

  const updated = await base(accountTableName).update([
    {
      id: accountId,
      fields: { Status: newStatus }
    }
  ]);

  return updated[0];
}

export async function updateAccountRecord(accountId: string, fields: any) {
  return base(accountTableName).update([
    {
      id: accountId,
      fields
    }
  ]);
}

export async function updatePatientRecord(masterId: string, fields: any) {
  return base('Master').update([
    {
      id: masterId,
      fields
    }
  ]);
}

