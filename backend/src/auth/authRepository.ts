import { ChallengePurpose, InviteRecord, OtpChallenge, SessionRecord, UserAccount } from "./authTypes";

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserAccount | null>;
  findUserById(id: string): Promise<UserAccount | null>;
  createInvite(invite: InviteRecord): Promise<void>;
  findInvite(tokenHash: string): Promise<InviteRecord | null>;
  startChallenge(challenge: OtpChallenge): Promise<boolean>;
  findChallenge(email: string): Promise<OtpChallenge | null>;
  recordFailedAttempt(email: string, challengeId: string): Promise<number | null>;
  completeChallenge(
    email: string,
    challengeId: string,
    purpose: ChallengePurpose,
    userId: string,
    now: Date,
  ): Promise<UserAccount | null>;
  createProvisionedUser(user: UserAccount): Promise<void>;
  createSession(session: SessionRecord): Promise<void>;
  findSession(tokenHash: string, now: Date): Promise<{ session: SessionRecord; user: UserAccount } | null>;
  touchSession(tokenHash: string, now: Date, expiresAt: Date): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  hasAdministrator(): Promise<boolean>;
}
