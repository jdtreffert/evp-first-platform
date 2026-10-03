export type UserRole = "administrator" | "clinical" | "patient";

export interface UserAccount {
  id: string;
  email: string;
  role: UserRole;
  masterId: string | null;
  createdAt: string;
}

export interface InviteRecord {
  tokenHash: string;
  masterId: string;
  expiresAt: string;
  createdBy: string;
}

export type ChallengePurpose = "login" | "patient-registration" | "bootstrap";

export interface OtpChallenge {
  id: string;
  email: string;
  codeHash: string;
  purpose: ChallengePurpose;
  inviteTokenHash: string | null;
  attempts: number;
  createdAt: string;
  expiresAt: string;
  lastSentAt: string;
}

export interface SessionRecord {
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
}
