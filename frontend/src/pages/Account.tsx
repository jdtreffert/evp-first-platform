import { useAuth } from "../auth/useAuth";

export default function Account() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold">Account</h1>
      <p className="mt-2 text-slate-300">Your account identity and access role.</p>
      <dl className="mt-8 divide-y divide-slate-700 rounded-xl border border-slate-700 bg-slate-800 px-5">
        <div className="grid gap-1 py-4 sm:grid-cols-3">
          <dt className="text-sm text-slate-400">Email</dt>
          <dd className="sm:col-span-2">{user?.email}</dd>
        </div>
        <div className="grid gap-1 py-4 sm:grid-cols-3">
          <dt className="text-sm text-slate-400">Role</dt>
          <dd className="capitalize sm:col-span-2">{user?.role}</dd>
        </div>
        {user?.role === "patient" && (
          <div className="grid gap-1 py-4 sm:grid-cols-3">
            <dt className="text-sm text-slate-400">Patient record</dt>
            <dd className="sm:col-span-2">{user.masterId}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
