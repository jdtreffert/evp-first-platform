import { promises as fs } from "fs";
import path from "path";
import { AuthRepository } from "./authRepository";
import { ChallengePurpose, InviteRecord, OtpChallenge, SessionRecord, UserAccount } from "./authTypes";

interface AuthStore {
  version: 1;
  users: UserAccount[];
  invites: InviteRecord[];
  challenges: OtpChallenge[];
  sessions: SessionRecord[];
}

const emptyStore = (): AuthStore => ({ version: 1, users: [], invites: [], challenges: [], sessions: [] });

function isAuthStore(value: unknown): value is AuthStore {
  const store = value as Partial<AuthStore> | null;
  return (
    typeof store === "object" &&
    store !== null &&
    store.version === 1 &&
    Array.isArray(store.users) &&
    Array.isArray(store.invites) &&
    Array.isArray(store.challenges) &&
    Array.isArray(store.sessions)
  );
}

export class FileAuthRepository implements AuthRepository {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  findUserByEmail(email: string): Promise<UserAccount | null> {
    return this.read((store) => store.users.find((user) => user.email === email) ?? null);
  }

  findUserById(id: string): Promise<UserAccount | null> {
    return this.read((store) => store.users.find((user) => user.id === id) ?? null);
  }

  createInvite(invite: InviteRecord): Promise<void> {
    return this.mutate((store) => {
      store.invites.push(invite);
    });
  }

  findInvite(tokenHash: string): Promise<InviteRecord | null> {
    return this.read((store) => store.invites.find((invite) => invite.tokenHash === tokenHash) ?? null);
  }

  startChallenge(challenge: OtpChallenge): Promise<boolean> {
    return this.mutate((store) => {
      const previous = store.challenges.find((item) => item.email === challenge.email);
      if (previous && Date.parse(challenge.createdAt) - Date.parse(previous.lastSentAt) < 60_000) {
        return false;
      }
      store.challenges = store.challenges.filter((item) => item.email !== challenge.email);
      store.challenges.push(challenge);
      return true;
    });
  }

  findChallenge(email: string): Promise<OtpChallenge | null> {
    return this.read((store) => store.challenges.find((item) => item.email === email) ?? null);
  }

  recordFailedAttempt(email: string, challengeId: string): Promise<number | null> {
    return this.mutate((store) => {
      const challenge = store.challenges.find((item) => item.email === email && item.id === challengeId);
      if (!challenge) return null;
      challenge.attempts += 1;
      if (challenge.attempts >= 5) {
        store.challenges = store.challenges.filter((item) => item.id !== challengeId);
        return 5;
      }
      return challenge.attempts;
    });
  }

  completeChallenge(
    email: string,
    challengeId: string,
    purpose: ChallengePurpose,
    userId: string,
    now: Date,
  ): Promise<UserAccount | null> {
    return this.mutate((store) => {
      const challenge = store.challenges.find((item) => item.email === email && item.id === challengeId);
      if (!challenge || challenge.purpose !== purpose || Date.parse(challenge.expiresAt) <= now.getTime()) {
        return null;
      }

      let user = store.users.find((item) => item.email === email) ?? null;
      if (purpose === "patient-registration") {
        const invite = challenge.inviteTokenHash
          ? store.invites.find((item) => item.tokenHash === challenge.inviteTokenHash)
          : undefined;
        if (!invite || Date.parse(invite.expiresAt) <= now.getTime() || user) return null;
        user = { id: userId, email, role: "patient", masterId: invite.masterId, createdAt: now.toISOString() };
        store.users.push(user);
        store.invites = store.invites.filter((item) => item.tokenHash !== invite.tokenHash);
      } else if (purpose === "bootstrap") {
        if (store.users.some((item) => item.role === "administrator") || user) return null;
        user = { id: userId, email, role: "administrator", masterId: null, createdAt: now.toISOString() };
        store.users.push(user);
      } else if (!user) {
        return null;
      }

      store.challenges = store.challenges.filter((item) => item.id !== challengeId);
      return user;
    });
  }

  createProvisionedUser(user: UserAccount): Promise<void> {
    return this.mutate((store) => {
      if (store.users.some((item) => item.email === user.email)) {
        throw new Error("An account with this email already exists");
      }
      store.users.push(user);
    });
  }

  createSession(session: SessionRecord): Promise<void> {
    return this.mutate((store) => {
      store.sessions = store.sessions.filter((item) => item.tokenHash !== session.tokenHash);
      store.sessions.push(session);
    });
  }

  findSession(tokenHash: string, now: Date): Promise<{ session: SessionRecord; user: UserAccount } | null> {
    return this.mutate((store) => {
      store.sessions = store.sessions.filter(
        (item) => Date.parse(item.expiresAt) > now.getTime() &&
          now.getTime() - Date.parse(item.lastSeenAt) < 30 * 60_000,
      );
      const session = store.sessions.find((item) => item.tokenHash === tokenHash);
      if (!session) return null;
      const user = store.users.find((item) => item.id === session.userId);
      return user ? { session, user } : null;
    });
  }

  touchSession(tokenHash: string, now: Date, expiresAt: Date): Promise<void> {
    return this.mutate((store) => {
      const session = store.sessions.find((item) => item.tokenHash === tokenHash);
      if (!session) return;
      session.lastSeenAt = now.toISOString();
      session.expiresAt = expiresAt.toISOString();
    });
  }

  deleteSession(tokenHash: string): Promise<void> {
    return this.mutate((store) => {
      store.sessions = store.sessions.filter((item) => item.tokenHash !== tokenHash);
    });
  }

  hasAdministrator(): Promise<boolean> {
    return this.read((store) => store.users.some((user) => user.role === "administrator"));
  }

  private read<T>(reader: (store: AuthStore) => T): Promise<T> {
    return this.enqueue(async () => reader(await this.readStore()));
  }

  private mutate<T>(mutation: (store: AuthStore) => T): Promise<T> {
    return this.enqueue(async () => {
      const store = await this.readStore();
      const result = mutation(store);
      await this.writeStore(store);
      return result;
    });
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async readStore(): Promise<AuthStore> {
    let content: string;
    try {
      content = await fs.readFile(this.filePath, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptyStore();
      throw err;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Auth store is not valid JSON: ${this.filePath}`);
    }
    if (!isAuthStore(parsed)) throw new Error(`Auth store has an unrecognized format: ${this.filePath}`);
    return parsed;
  }

  private async writeStore(store: AuthStore): Promise<void> {
    const tempPath = `${this.filePath}.${process.pid}.tmp`;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(tempPath, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 });
    await fs.rename(tempPath, this.filePath);
    await fs.chmod(this.filePath, 0o600);
  }
}
