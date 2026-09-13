import { base, accountTableName } from "../airtable/client";
import { createMasterRecord } from "../airtable/master";
import { createAccountRecord } from "../airtable/account";
import { generateUID } from "./uid";

// -----------------------------
// findOrCreateAccountAndMaster
// -----------------------------
export async function findOrCreateAccountAndMaster(email: string, firstName: string, lastName: string) {
  const existing = await base(accountTableName).select({
    filterByFormula: `{Email} = "${email}"`
  }).firstPage();

  if (existing.length > 0) {
    const account = existing[0];
    const uid = account.get("UID");
    return { uid, accountId: account.id, created: false };
  }

  const uid = generateUID();

  const masterRecord = await createMasterRecord({
    UID: uid,
    CreatedAt: new Date().toISOString(),
    ConsentVersion: "v1"
  });

  const accountRecord = await createAccountRecord({
    UID: uid,
    Email: email,
    FirstName: firstName,
    LastName: lastName,
    ConsentVersion: "v1",
    Status: "invited",
    CreatedAt: new Date().toISOString()
  });

  return {
    uid,
    accountId: accountRecord.id,
    masterId: masterRecord.id,
    created: true
  };
}

// -----------------------------
// Onboarding status transitions
// -----------------------------
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
  const currentStatus = String(record.get("Status"));
  const allowed = allowedTransitions[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid onboarding transition: ${currentStatus} → ${newStatus}`);
  }

  const updated = await base(accountTableName).update([
    { id: accountId, fields: { Status: newStatus } }
  ]);

  return updated[0];
}

// -----------------------------
// Update Account
// -----------------------------
export async function updateAccountRecord(accountId: string, fields: any) {
  return base(accountTableName).update([{ id: accountId, fields }]);
}

// -----------------------------
// Update Master
// -----------------------------
export async function updateMasterRecord(masterId: string, fields: any) {
  return base("Master").update([{ id: masterId, fields }]);
}
