import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

type Flow = "login" | "register" | "bootstrap";

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [flow, setFlow] = useState<Flow>("login");
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [bootstrapSecret, setBootstrapSecret] = useState("");
  const [code, setCode] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.loading && auth.user) navigate("/", { replace: true });
  }, [auth.loading, auth.user, navigate]);

  const requestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (flow === "register") {
        await auth.requestPatientRegistration(email, inviteCode);
        setNotice("If the invite is valid, a sign-in code will be sent to the address.");
      } else if (flow === "bootstrap") {
        await auth.requestAdminBootstrap(email, bootstrapSecret);
        setNotice("A sign-in code will be sent to the administrator email.");
      } else {
        await auth.requestLoginCode(email);
        setNotice("If the address is registered, a sign-in code will be sent.");
      }
      setCodeRequested(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request a sign-in code");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await auth.verifyCode(email, code);
      const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(destination || "/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify the code");
    } finally {
      setBusy(false);
    }
  };

  const changeFlow = (next: Flow) => {
    setFlow(next);
    setCodeRequested(false);
    setCode("");
    setError(null);
    setNotice(null);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-xl">
        <Link to="/" className="text-sm font-semibold tracking-wide text-cyan-300">EVP FIRST</Link>
        <h1 className="mt-6 text-3xl font-semibold">
          {flow === "register" ? "Create your patient account" : flow === "bootstrap" ? "Set up administrator" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          We’ll email you a one-time code. It expires in 10 minutes.
        </p>

        {!codeRequested ? (
          <form className="mt-7 space-y-5" onSubmit={requestCode}>
            <label className="block text-sm font-medium">
              Email address
              <input
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-base outline-none focus:border-cyan-400"
              />
            </label>

            {flow === "register" && (
              <label className="block text-sm font-medium">
                Patient invitation code
                <input
                  type="text"
                  autoComplete="off"
                  required
                  minLength={32}
                  maxLength={128}
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-base outline-none focus:border-cyan-400"
                />
              </label>
            )}

            {flow === "bootstrap" && (
              <label className="block text-sm font-medium">
                Administrator bootstrap secret
                <input
                  type="password"
                  autoComplete="off"
                  required
                  value={bootstrapSecret}
                  onChange={(event) => setBootstrapSecret(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-base outline-none focus:border-cyan-400"
                />
              </label>
            )}

            {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
            {auth.error && <p role="alert" className="text-sm text-rose-300">{auth.error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send one-time code"}
            </button>
          </form>
        ) : (
          <form className="mt-7 space-y-5" onSubmit={verify}>
            {notice && <p role="status" className="rounded-lg bg-slate-800 p-3 text-sm text-cyan-100">{notice}</p>}
            <p className="text-sm text-slate-300">Enter the six-digit code sent to <strong>{email}</strong>.</p>
            <label className="block text-sm font-medium">
              One-time code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                required
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-cyan-400"
              />
            </label>
            {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "Verifying…" : "Verify and continue"}
            </button>
            <button
              type="button"
              onClick={() => setCodeRequested(false)}
              className="w-full rounded-lg border border-slate-700 px-4 py-3 text-sm hover:bg-slate-800"
            >
              Use a different email or invite
            </button>
          </form>
        )}

        <div className="mt-7 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-800 pt-5 text-sm">
          <button type="button" onClick={() => changeFlow("login")} className="text-slate-300 hover:text-cyan-300">
            Sign in
          </button>
          <button type="button" onClick={() => changeFlow("register")} className="text-slate-300 hover:text-cyan-300">
            Patient invitation
          </button>
          <button type="button" onClick={() => changeFlow("bootstrap")} className="text-slate-500 hover:text-cyan-300">
            First administrator setup
          </button>
        </div>
      </div>
    </main>
  );
}
