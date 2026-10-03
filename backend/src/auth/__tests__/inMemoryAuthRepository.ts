import { AuthRepository } from "../authRepository";
import { ChallengePurpose, InviteRecord, OtpChallenge, SessionRecord, UserAccount } from "../authTypes";

export class InMemoryAuthRepository implements AuthRepository {
  readonly users: UserAccount[] = [];
  readonly invites: InviteRecord[] = [];
  readonly challenges: OtpChallenge[] = [];
  readonly sessions: SessionRecord[] = [];

  async findUserByEmail(email: string): Promise<UserAccount | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findUserById(id: string): Promise<UserAccount | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async createInvite(invite: InviteRecord): Promise<void> {
    this.invites.push(invite);
  }

  async findInvite(tokenHash: string): Promise<InviteRecord | null> {
    return this.invites.find((invite) => invite.tokenHash === tokenHash) ?? null;
  }

  async startChallenge(challenge: OtpChallenge): Promise<boolean> {
    const previous = this.challenges.find((item) => item.email === challenge.email);
    if (previous && Date.parse(challenge.createdAt) - Date.parse(previous.lastSentAt) < 60_000) return false;
    this.remove(this.challenges, (item) => item.email === challenge.email);
    this.challenges.push(challenge);
    return true;
  }

  async findChallenge(email: string): Promise<OtpChallenge | null> {
    return this.challenges.find((challenge) => challenge.email === email) ?? null;
  }

  async recordFailedAttempt(email: string, challengeId: string): Promise<number | null> {
    const challenge = this.challenges.find((item) => item.email === email && item.id === challengeId);
    if (!challenge) return null;
    challenge.attempts += 1;
    if (challenge.attempts >= 5) {
      this.remove(this.challenges, (item) => item.id === challengeId);
      return 5;
    }
    return challenge.attempts;
  }

  async completeChallenge(
    email: string,
    challengeId: string,
    purpose: ChallengePurpose,
    userId: string,
    now: Date,
  ): Promise<UserAccount | null> {
    const challenge = this.challenges.find((item) => item.email === email && item.id === challengeId);
    if (!challenge || challenge.purpose !== purpose || Date.parse(challenge.expiresAt) <= now.getTime()) return null;
    let user = this.users.find((item) => item.email === email) ?? null;
    if (purpose === "patient-registration") {
      const invite = challenge.inviteTokenHash
        ? this.invites.find((item) => item.tokenHash === challenge.inviteTokenHash)
        : undefined;
      if (!invite || Date.parse(invite.expiresAt) <= now.getTime() || user) return null;
      user = { id: userId, email, role: "patient", masterId: invite.masterId, createdAt: now.toISOString() };
      this.users.push(user);
      this.remove(this.invites, (item) => item.tokenHash === invite.tokenHash);
    } else if (purpose === "bootstrap") {
      if (this.users.some((item) => item.role === "administrator") || user) return null;
      user = { id: userId, email, role: "administrator", masterId: null, createdAt: now.toISOString() };
      this.users.push(user);
    } else if (!user) {
      return null;
    }
    this.remove(this.challenges, (item) => item.id === challengeId);
    return user;
  }

  async createProvisionedUser(user: UserAccount): Promise<void> {
    if (this.users.some((item) => item.email === user.email)) throw new Error("An account with this email already exists");
    this.users.push(user);
  }

  async createSession(session: SessionRecord): Promise<void> {
    this.remove(this.sessions, (item) => item.tokenHash === session.tokenHash);
    this.sessions.push(session);
  }

  async findSession(tokenHash: string, now: Date): Promise<{ session: SessionRecord; user: UserAccount } | null> {
    this.remove(this.sessions, (item) => (
      Date.parse(item.expiresAt) <= now.getTime() ||
      now.getTime() - Date.parse(item.lastSeenAt) >= 30 * 60_000
    ));
    const session = this.sessions.find((item) => item.tokenHash === tokenHash);
    const user = session ? this.users.find((item) => item.id === session.userId) : undefined;
    return session && user ? { session, user } : null;
  }

  async touchSession(tokenHash: string, now: Date, expiresAt: Date): Promise<void> {
    const session = this.sessions.find((item) => item.tokenHash === tokenHash);
    if (session) {
      session.lastSeenAt = now.toISOString();
      session.expiresAt = expiresAt.toISOString();
    }
  }

  async deleteSession(tokenHash: string): Promise<void> {
    this.remove(this.sessions, (item) => item.tokenHash === tokenHash);
  }

  async hasAdministrator(): Promise<boolean> {
    return this.users.some((user) => user.role === "administrator");
  }

  seedUser(user: UserAccount): void {
    this.users.push(user);
  }

  private remove<T>(items: T[], predicate: (item: T) => boolean): void {
    for (let i = items.length - 1; i >= 0; i -= 1) {
      if (predicate(items[i])) items.splice(i, 1);
    }
  }
}
