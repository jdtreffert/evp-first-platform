import { createContext } from "react";

export type UserRole = "administrator" | "clinical" | "patient";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  masterId: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  requestLoginCode(email: string): Promise<void>;
  requestPatientRegistration(email: string, inviteCode: string): Promise<void>;
  requestAdminBootstrap(email: string, secret: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  logout(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
