import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "crypto";
import { AuthRepository } from "./authRepository";
import { EmailProvider } from "./emailProvider";
import { ChallengePurpose, OtpChallenge, UserAccount, UserRole } from "./authTypes";
import { HttpError } from "../utils/httpError";

const OTP_LIFETIME_MS = 10 * 60_000;
const SESSION_LIFETIME_MS = 12 * 60 * 60_000;
const IDLE_LIFETIME_MS = 30 * 60_000;
const OTP_MAX_ATTEMPTS = 5;
const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60_000;

export interface AuthServiceOptions {
  repository: AuthRepository;
  emailProvider: EmailProvider;
  sessionSecret: string;
  bootstrapSecret?: string;
  secureCookies: boolean;
}

export interface AuthenticatedSession {
  user: UserAccount;
  tokenHash: string;
  expiresAt: Date;
}

export interface InviteResult {
  code: string;
  expiresAt: string;
}

export class AuthService {
  constructor(private readonly options: AuthServiceOptions) {
    if (options.sessionSecret.length < 32) {
      throw new Error("AUTH_SESSION_SECRET must be at least 32 characters");
    }
  }

  async requestLoginCode(rawEmail: string): Promise<void> {
    const email = normalizeEmail(rawEmail);
    const user = await this.options.repository.findUserByEmail(email);
    if (user) await this.sendChallenge(email, "login", null);
  }

  async requestPatientRegistration(rawEmail: string, rawInvite: string): Promise<void> {
    const email = normalizeEmail(rawEmail);
    const inviteHash = this.hashOpaque(rawInvite);
    const [user, invite] = await Promise.all([
      this.options.repository.findUserByEmail(email),
      this.options.repository.findInvite(inviteHash),
    ]);
    if (
      user ||
      !invite ||
      Date.parse(invite.expiresAt) <= Date.now()
    ) {
      return;
    }
    await this.sendChallenge(email, "patient-registration", inviteHash);
  }

  async requestBootstrap(rawEmail: string, suppliedSecret: string): Promise<void> {
    const expected = this.options.bootstrapSecret;
    if (!expected || !constantTimeStringEqual(expected, suppliedSecret)) {
      throw new HttpError(403, "Invalid bootstrap credentials");
    }
    if (await this.options.repository.hasAdministrator()) {
      throw new HttpError(409, "Administrator bootstrap has already been used");
    }
    const email = normalizeEmail(rawEmail);
    if (await this.options.repository.findUserByEmail(email)) {
      throw new HttpError(409, "An account with this email already exists");
    }
    await this.sendChallenge(email, "bootstrap", null);
  }

  async verifyCode(rawEmail: string, rawCode: string): Promise<{ user: UserAccount; sessionToken: string; expiresAt: Date }> {
    const email = normalizeEmail(rawEmail);
    const code = rawCode.trim();
    const challenge = await this.options.repository.findChallenge(email);
    if (
      !challenge ||
      Date.parse(challenge.expiresAt) <= Date.now() ||
      challenge.attempts >= OTP_MAX_ATTEMPTS
    ) {
      throw new HttpError(400, "Invalid or expired code");
    }

    const givenHash = this.hashCode(email, challenge.id, code);
    if (!constantTimeStringEqual(challenge.codeHash, givenHash)) {
      await this.options.repository.recordFailedAttempt(email, challenge.id);
      throw new HttpError(400, "Invalid or expired code");
    }

    const user = await this.options.repository.completeChallenge(
      email,
      challenge.id,
      challenge.purpose,
      randomUUID(),
      new Date(),
    );
    if (!user) throw new HttpError(400, "Invalid or expired code");

    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);
    const tokenHash = this.hashOpaque(token);
    await this.options.repository.createSession({
      tokenHash,
      userId: user.id,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastSeenAt: now.toISOString(),
    });
    return { user, sessionToken: token, expiresAt };
  }

  async provisionAccount(emailInput: string, role: "administrator" | "clinical"): Promise<void> {
    const email = normalizeEmail(emailInput);
    const user: UserAccount = {
      id: randomUUID(),
      email,
      role,
      masterId: null,
      createdAt: new Date().toISOString(),
    };
    try {
      await this.options.repository.createProvisionedUser(user);
    } catch (err) {
      if (err instanceof Error && err.message === "An account with this email already exists") {
        throw new HttpError(409, err.message);
      }
      throw err;
    }
    await this.sendChallenge(email, "login", null);
  }

  async createPatientInvite(masterId: string, createdBy: string): Promise<InviteResult> {
    const code = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS);
    await this.options.repository.createInvite({
      tokenHash: this.hashOpaque(code),
      masterId,
      expiresAt: expiresAt.toISOString(),
      createdBy,
    });
    return { code, expiresAt: expiresAt.toISOString() };
  }

  async authenticate(token: string | undefined): Promise<AuthenticatedSession | null> {
    if (!token) return null;
    const tokenHash = this.hashOpaque(token);
    const now = new Date();
    const found = await this.options.repository.findSession(tokenHash, now);
    if (!found) return null;
    await this.options.repository.touchSession(tokenHash, now, new Date(Date.parse(found.session.expiresAt)));
    return {
      user: found.user,
      tokenHash,
      expiresAt: new Date(found.session.expiresAt),
    };
  }

  async logout(tokenHash: string | undefined): Promise<void> {
    if (tokenHash) await this.options.repository.deleteSession(tokenHash);
  }

  sessionCookie(token: string, expiresAt: Date): string {
    const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    return [
      `evp_session=${encodeURIComponent(token)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${maxAge}`,
      ...(this.options.secureCookies ? ["Secure"] : []),
    ].join("; ");
  }

  clearSessionCookie(): string {
    return [
      "evp_session=",
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=0",
      ...(this.options.secureCookies ? ["Secure"] : []),
    ].join("; ");
  }

  private async sendChallenge(email: string, purpose: ChallengePurpose, inviteTokenHash: string | null): Promise<void> {
    const now = new Date();
    const id = randomUUID();
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const challenge: OtpChallenge = {
      id,
      email,
      codeHash: this.hashCode(email, id, code),
      purpose,
      inviteTokenHash,
      attempts: 0,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS).toISOString(),
      lastSentAt: now.toISOString(),
    };
    if (!(await this.options.repository.startChallenge(challenge))) return;
    try {
      await this.options.emailProvider.sendSignInCode(email, code);
    } catch (err) {
      console.error("Email provider failed to send an authentication code", err);
      throw new HttpError(503, "Unable to send an authentication code");
    }
  }

  private hashCode(email: string, challengeId: string, code: string): string {
    return createHmac("sha256", this.options.sessionSecret)
      .update(`${email}\0${challengeId}\0${code}`)
      .digest("hex");
  }

  private hashOpaque(value: string): string {
    return createHmac("sha256", this.options.sessionSecret).update(value).digest("hex");
  }
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isUserRole(value: string): value is UserRole {
  return value === "administrator" || value === "clinical" || value === "patient";
}

function constantTimeStringEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const authLimits = {
  otpLifetimeMs: OTP_LIFETIME_MS,
  otpMaxAttempts: OTP_MAX_ATTEMPTS,
  sessionLifetimeMs: SESSION_LIFETIME_MS,
  idleLifetimeMs: IDLE_LIFETIME_MS,
  inviteLifetimeMs: INVITE_LIFETIME_MS,
};
