import { promises as fs } from "fs";
import { createHmac } from "crypto";
import os from "os";
import path from "path";
import { AuthService } from "../authService";
import { EmailProvider } from "../emailProvider";
import { InMemoryAuthRepository } from "./inMemoryAuthRepository";
import { FileAuthRepository } from "../fileAuthRepository";

class CapturingEmailProvider implements EmailProvider {
  readonly sent: Array<{ email: string; code: string }> = [];
  async sendSignInCode(email: string, code: string): Promise<void> {
    this.sent.push({ email, code });
  }
}

const secret = "auth-service-unit-test-session-secret-at-least-32";

function fixture(options: { bootstrapSecret?: string; secureCookies?: boolean } = {}) {
  const repository = new InMemoryAuthRepository();
  const email = new CapturingEmailProvider();
  const auth = new AuthService({
    repository,
    emailProvider: email,
    sessionSecret: secret,
    bootstrapSecret: options.bootstrapSecret,
    secureCookies: options.secureCookies ?? false,
  });
  return { auth, repository, email };
}

describe("AuthService one-time-code flows", () => {
  test("normalizes login email and uses a generic response for unregistered addresses", async () => {
    const { auth, repository, email } = fixture();
    repository.seedUser({
      id: "u1",
      email: "patient@example.test",
      role: "patient",
      masterId: "M1",
      createdAt: new Date().toISOString(),
    });

    await auth.requestLoginCode(" PATIENT@Example.Test ");
    await auth.requestLoginCode("unknown@example.test");

    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].email).toBe("patient@example.test");
    expect(await repository.findChallenge("unknown@example.test")).toBeNull();
  });

  test("throttles repeat code requests for one minute", async () => {
    const { auth, repository, email } = fixture();
    repository.seedUser({
      id: "u1",
      email: "patient@example.test",
      role: "patient",
      masterId: "M1",
      createdAt: new Date().toISOString(),
    });

    await auth.requestLoginCode("patient@example.test");
    await auth.requestLoginCode("patient@example.test");
    expect(email.sent).toHaveLength(1);
  });

  test("uses a verified single-use invite to register a patient to its bound master record", async () => {
    const { auth, repository, email } = fixture();
    const invite = await auth.createPatientInvite("M1", "admin");
    await auth.requestPatientRegistration("Patient@Example.Test", invite.code);

    expect(email.sent[0].email).toBe("patient@example.test");
    const session = await auth.verifyCode(email.sent[0].email, email.sent[0].code);
    expect(session.user).toMatchObject({
      email: "patient@example.test",
      role: "patient",
      masterId: "M1",
    });
    expect(await repository.findInvite("unused")).toBeNull();
    expect(await repository.findUserByEmail("patient@example.test")).toEqual(session.user);
    await expect(auth.requestPatientRegistration("another@example.test", invite.code)).resolves.toBeUndefined();
    expect(email.sent).toHaveLength(1);
  });

  test("invalid or expired patient invite does not send a code", async () => {
    const { auth, repository, email } = fixture();
    await auth.requestPatientRegistration("patient@example.test", "x".repeat(32));
    const invite = await auth.createPatientInvite("M1", "admin");
    const stored = await repository.findInvite(createHmacHash(secret, invite.code));
    if (stored) stored.expiresAt = new Date(Date.now() - 1).toISOString();
    await auth.requestPatientRegistration("patient@example.test", invite.code);
    expect(email.sent).toHaveLength(0);
  });

  test("invalidates a code after five wrong attempts", async () => {
    const { auth, repository, email } = fixture();
    repository.seedUser({
      id: "u1",
      email: "patient@example.test",
      role: "patient",
      masterId: "M1",
      createdAt: new Date().toISOString(),
    });
    await auth.requestLoginCode("patient@example.test");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const wrong = email.sent[0].code === "000000" ? "999999" : "000000";
      await expect(auth.verifyCode("patient@example.test", wrong)).rejects.toThrow("Invalid or expired code");
    }
    await expect(auth.verifyCode("patient@example.test", email.sent[0].code)).rejects.toThrow(
      "Invalid or expired code",
    );
    expect(await repository.findChallenge("patient@example.test")).toBeNull();
  });

  test("expires codes after ten minutes", async () => {
    const { auth, repository, email } = fixture();
    repository.seedUser({
      id: "u1",
      email: "patient@example.test",
      role: "patient",
      masterId: "M1",
      createdAt: new Date().toISOString(),
    });
    await auth.requestLoginCode("patient@example.test");
    const challenge = await repository.findChallenge("patient@example.test");
    challenge!.expiresAt = new Date(Date.now() - 1).toISOString();

    await expect(auth.verifyCode("patient@example.test", email.sent[0].code)).rejects.toThrow(
      "Invalid or expired code",
    );
  });

  test("code can only create one session even when verification races", async () => {
    const { auth, repository, email } = fixture();
    repository.seedUser({
      id: "u1",
      email: "patient@example.test",
      role: "patient",
      masterId: "M1",
      createdAt: new Date().toISOString(),
    });
    await auth.requestLoginCode("patient@example.test");
    const attempts = await Promise.allSettled([
      auth.verifyCode("patient@example.test", email.sent[0].code),
      auth.verifyCode("patient@example.test", email.sent[0].code),
    ]);

    expect(attempts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(repository.sessions).toHaveLength(1);
  });

  test("bootstrap secret can create the first administrator only once", async () => {
    const { auth, repository, email } = fixture({ bootstrapSecret: "bootstrap-secret" });
    await auth.requestBootstrap("admin@example.test", "bootstrap-secret");
    const result = await auth.verifyCode("admin@example.test", email.sent[0].code);
    expect(result.user).toMatchObject({ role: "administrator", masterId: null });
    expect(await repository.hasAdministrator()).toBe(true);
    await expect(auth.requestBootstrap("second@example.test", "bootstrap-secret")).rejects.toMatchObject({
      status: 409,
    });
  });

  test("bootstrap rejects a wrong secret without creating a challenge", async () => {
    const { auth, repository, email } = fixture({ bootstrapSecret: "bootstrap-secret" });
    await expect(auth.requestBootstrap("admin@example.test", "wrong")).rejects.toMatchObject({ status: 403 });
    expect(await repository.findChallenge("admin@example.test")).toBeNull();
    expect(email.sent).toHaveLength(0);
  });

  test("administrator provisions only clinical or administrator accounts", async () => {
    const { auth, repository, email } = fixture();
    await auth.provisionAccount("CLINICIAN@example.test", "clinical");
    expect(await repository.findUserByEmail("clinician@example.test")).toMatchObject({
      role: "clinical",
      masterId: null,
    });
    expect(email.sent[0].email).toBe("clinician@example.test");
    await expect(auth.provisionAccount("clinician@example.test", "administrator")).rejects.toMatchObject({
      status: 409,
    });
  });

  test("session expires after 12 hours or 30 minutes idle", async () => {
    const { auth, repository, email } = fixture();
    repository.seedUser({
      id: "u1",
      email: "patient@example.test",
      role: "patient",
      masterId: "M1",
      createdAt: new Date().toISOString(),
    });
    await auth.requestLoginCode("patient@example.test");
    const result = await auth.verifyCode("patient@example.test", email.sent[0].code);

    expect(await auth.authenticate(result.sessionToken)).not.toBeNull();
    repository.sessions[0].lastSeenAt = new Date(Date.now() - 31 * 60_000).toISOString();
    expect(await auth.authenticate(result.sessionToken)).toBeNull();
  });

  test("session cookie is HttpOnly, SameSite=Lax, and Secure in production", () => {
    const { auth } = fixture({ secureCookies: true });
    const cookie = auth.sessionCookie("abc", new Date(Date.now() + 60_000));
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
  });

  test("stores only a keyed hash of the OTP", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "evp-auth-"));
    try {
      const repository = new FileAuthRepository(path.join(dir, "auth.json"));
      await repository.createProvisionedUser({
        id: "u1",
        email: "patient@example.test",
        role: "patient",
        masterId: "M1",
        createdAt: new Date().toISOString(),
      });
      const email = new CapturingEmailProvider();
      const auth = new AuthService({ repository, emailProvider: email, sessionSecret: secret, secureCookies: false });
      await auth.requestLoginCode("patient@example.test");
      const content = await fs.readFile(path.join(dir, "auth.json"), "utf8");
      expect(content).not.toContain(email.sent[0].code);
      expect(content).toContain("codeHash");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

function createHmacHash(key: string, value: string): string {
  return createHmac("sha256", key).update(value).digest("hex");
}
