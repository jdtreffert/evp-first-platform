import { useState } from "react";
import type { FormEvent } from "react";
import { postJson } from "../api/client";

const inputClass = "mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-white";

function generateMasterId(): string {
  return `PT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export default function AdminPanel() {
  const [masterId, setMasterId] = useState(generateMasterId);
  const [invite, setInvite] = useState<{ masterId: string; code: string; expiresAt: string } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountRole, setAccountRole] = useState<"clinical" | "administrator">("clinical");
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  const createInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInviteError(null);
    setInvite(null);
    try {
      const id = masterId.trim();
      const result = await postJson<{ code: string; expiresAt: string }>("/auth/invites", { masterId: id });
      setInvite({ masterId: id, ...result });
      setMasterId(generateMasterId());
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Unable to create the invite");
    }
  };

  const provisionAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError(null);
    setAccountMessage(null);
    try {
      await postJson("/auth/accounts", { email: accountEmail, role: accountRole });
      setAccountMessage(`Account created. A sign-in code was sent to ${accountEmail}.`);
      setAccountEmail("");
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Unable to create the account");
    }
  };

  return (
    <section className="mt-10 space-y-8">
      <h2 className="text-2xl font-semibold">Administration</h2>

      <form onSubmit={(event) => void createInvite(event)} className="space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-5">
        <h3 className="text-lg font-medium">Create a patient record and invite</h3>
        <p className="text-sm text-slate-300">
          The patient ID links all of a patient’s events. Enter the ID on the Timeline tab to add events
          for this patient, and give the one-time invite code to the patient so they can register.
        </p>
        <label className="block text-sm">
          Patient ID
          <input required maxLength={128} className={inputClass} value={masterId} onChange={(event) => setMasterId(event.target.value)} />
        </label>
        <button type="submit" className="rounded bg-cyan-500 px-4 py-2 font-medium text-slate-950 hover:bg-cyan-400">
          Create invite
        </button>
        {inviteError && <p role="alert" className="text-sm text-rose-300">{inviteError}</p>}
        {invite && (
          <div role="status" className="space-y-1 rounded border border-slate-600 bg-slate-900 p-3 text-sm">
            <p>Patient ID: <span className="font-mono">{invite.masterId}</span></p>
            <p>Invite code: <span className="break-all font-mono">{invite.code}</span></p>
            <p className="text-slate-400">
              Expires {new Date(invite.expiresAt).toLocaleString()}. This code is shown only once; copy it now.
            </p>
          </div>
        )}
      </form>

      <form onSubmit={(event) => void provisionAccount(event)} className="space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-5">
        <h3 className="text-lg font-medium">Add a clinical or administrator account</h3>
        <label className="block text-sm">
          Email address
          <input required type="email" maxLength={254} className={inputClass} value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} />
        </label>
        <label className="block text-sm">
          Role
          <select className={inputClass} value={accountRole} onChange={(event) => setAccountRole(event.target.value as "clinical" | "administrator")}>
            <option value="clinical">Clinical (read-only)</option>
            <option value="administrator">Administrator</option>
          </select>
        </label>
        <button type="submit" className="rounded bg-cyan-500 px-4 py-2 font-medium text-slate-950 hover:bg-cyan-400">
          Create account
        </button>
        {accountError && <p role="alert" className="text-sm text-rose-300">{accountError}</p>}
        {accountMessage && <p role="status" className="text-sm text-cyan-200">{accountMessage}</p>}
      </form>
    </section>
  );
}
