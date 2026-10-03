import { createHmac, randomUUID } from "crypto";
import { createApp } from "../app";
import { AuthService } from "../auth/authService";
import { EmailProvider } from "../auth/emailProvider";
import { InMemoryAuthRepository } from "../auth/__tests__/inMemoryAuthRepository";
import { UserRole } from "../auth/authTypes";
import { EventRepository } from "../persistence/eventRepository";

const SESSION_SECRET = "test-only-auth-session-secret-with-32-characters";
const RAW_TOKEN = "test-session-cookie-token";

class NullEmailProvider implements EmailProvider {
  async sendSignInCode(_email: string, _code: string): Promise<void> {}
}

export async function createAuthenticatedTestApp(
  repository: EventRepository,
  role: UserRole = "administrator",
  masterId: string | null = null,
) {
  const authRepository = new InMemoryAuthRepository();
  const user = {
    id: randomUUID(),
    email: `${role}@example.test`,
    role,
    masterId,
    createdAt: new Date().toISOString(),
  };
  authRepository.seedUser(user);
  const tokenHash = createHmac("sha256", SESSION_SECRET).update(RAW_TOKEN).digest("hex");
  const now = new Date();
  await authRepository.createSession({
    tokenHash,
    userId: user.id,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 12 * 60 * 60_000).toISOString(),
    lastSeenAt: now.toISOString(),
  });

  const auth = new AuthService({
    repository: authRepository,
    emailProvider: new NullEmailProvider(),
    sessionSecret: SESSION_SECRET,
    secureCookies: false,
  });

  return {
    app: createApp({ repository, auth }),
    auth,
    authRepository,
    user,
    cookie: `evp_session=${RAW_TOKEN}`,
  };
}
