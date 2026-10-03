import { Server } from "http";
import { AddressInfo } from "net";
import { AuthService } from "../auth/authService";
import { EmailProvider } from "../auth/emailProvider";
import { InMemoryAuthRepository } from "../auth/__tests__/inMemoryAuthRepository";
import { UserRole } from "../auth/authTypes";
import { createApp } from "../app";
import { InMemoryEventRepository } from "../persistence/__tests__/inMemoryEventRepository";
import { createHmac, randomUUID } from "crypto";

const SESSION_SECRET = "auth-http-test-session-secret-with-more-than-32";
const origin = "http://localhost:5173";

class TestEmailProvider implements EmailProvider {
  readonly sent: Array<{ email: string; code: string }> = [];
  async sendSignInCode(email: string, code: string): Promise<void> {
    this.sent.push({ email, code });
  }
}

describe("authentication and role-scoped API", () => {
  let server: Server;
  let base: string;
  let authRepo: InMemoryAuthRepository;
  let events: InMemoryEventRepository;
  let email: TestEmailProvider;

  beforeEach(async () => {
    authRepo = new InMemoryAuthRepository();
    events = new InMemoryEventRepository();
    email = new TestEmailProvider();
    const auth = new AuthService({
      repository: authRepo,
      emailProvider: email,
      sessionSecret: SESSION_SECRET,
      bootstrapSecret: "initial-admin-secret",
      secureCookies: false,
    });
    server = createApp({ repository: events, auth, frontendOrigin: origin }).listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const post = (route: string, body: unknown, cookie?: string, requestOrigin?: string) =>
    fetch(`${base}${route}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
        ...(requestOrigin ? { origin: requestOrigin } : {}),
      },
      body: JSON.stringify(body),
    });

  const seedUser = async (role: UserRole, masterId: string | null = null): Promise<string> => {
    const user = {
      id: randomUUID(),
      email: `${role}-${randomUUID()}@example.test`,
      role,
      masterId,
      createdAt: new Date().toISOString(),
    };
    authRepo.seedUser(user);
    const token = randomUUID();
    const tokenHash = createHmac("sha256", SESSION_SECRET).update(token).digest("hex");
    const now = new Date();
    await authRepo.createSession({
      tokenHash,
      userId: user.id,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 12 * 60 * 60_000).toISOString(),
      lastSeenAt: now.toISOString(),
    });
    return `evp_session=${token}`;
  };

  const get = (route: string, cookie?: string) =>
    fetch(`${base}${route}`, { headers: cookie ? { cookie } : {} });

  test("event endpoints require an authenticated session", async () => {
    expect((await get("/events/query")).status).toBe(401);
    expect((await post("/events/validate", {}, undefined)).status).toBe(401);
  });

  test("passwordless login issues a code and sets an HttpOnly session cookie", async () => {
    const cookie = await seedUser("clinical");
    const user = authRepo.users[0];
    const request = await post("/auth/login", { email: user.email.toUpperCase() });
    expect(request.status).toBe(202);
    expect(email.sent[0].email).toBe(user.email);

    const verify = await post("/auth/verify", { email: user.email, code: email.sent[0].code });
    expect(verify.status).toBe(200);
    expect(verify.headers.get("set-cookie")).toContain("HttpOnly");
    expect(verify.headers.get("set-cookie")).toContain("SameSite=Lax");
    expect((await verify.json()).user).toMatchObject({ email: user.email, role: "clinical" });
    expect((await get("/auth/me", cookie)).status).toBe(200);
  });

  test("login request response does not disclose whether an email is registered", async () => {
    const known = await seedUser("clinical");
    const knownEmail = authRepo.users[0].email;
    const responses = await Promise.all([
      post("/auth/login", { email: knownEmail }),
      post("/auth/login", { email: "unknown@example.test" }),
    ]);
    expect(responses.map((r) => r.status)).toEqual([202, 202]);
    expect(await responses[0].json()).toEqual(await responses[1].json());
    expect(known).toContain("evp_session=");
  });

  test("verification codes are single-use and logout revokes the session", async () => {
    await seedUser("clinical");
    const user = authRepo.users[0];
    await post("/auth/login", { email: user.email });
    const code = email.sent[0].code;
    const verify = await post("/auth/verify", { email: user.email, code });
    const sessionCookie = verify.headers.get("set-cookie")!.split(";")[0];
    expect(verify.status).toBe(200);

    expect((await post("/auth/verify", { email: user.email, code })).status).toBe(400);
    expect((await get("/auth/me", sessionCookie)).status).toBe(200);
    const logout = await post("/auth/logout", {}, sessionCookie);
    expect(logout.status).toBe(204);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await get("/auth/me", sessionCookie)).status).toBe(401);
  });

  test("bootstrap secret creates the first administrator, who can provision and invite", async () => {
    const bootstrap = await post("/auth/bootstrap", {
      email: "admin@example.test",
      secret: "initial-admin-secret",
    });
    expect(bootstrap.status).toBe(202);
    const code = email.sent[0].code;
    const verify = await post("/auth/verify", { email: "admin@example.test", code });
    expect(verify.status).toBe(200);
    const adminCookie = verify.headers.get("set-cookie")!.split(";")[0];

    expect((await post("/auth/bootstrap", { email: "second@example.test", secret: "initial-admin-secret" })).status).toBe(409);
    const invite = await post("/auth/invites", { masterId: "M1" }, adminCookie);
    expect(invite.status).toBe(201);
    expect((await invite.json()).code).toBeTruthy();
    const provision = await post("/auth/accounts", { email: "doctor@example.test", role: "clinical" }, adminCookie);
    expect(provision.status).toBe(202);
    expect(await authRepo.findUserByEmail("doctor@example.test")).toMatchObject({ role: "clinical" });
  });

  test("clinical users can read all events but cannot write", async () => {
    const clinicalCookie = await seedUser("clinical");
    await events.save({
      uid: "E1",
      masterId: "M1",
      eventType: "Note",
      eventDate: null,
      payload: { id: "r", fields: {} },
    });

    expect((await get("/events/query", clinicalCookie)).status).toBe(200);
    expect((await get("/events/E1", clinicalCookie)).status).toBe(200);
    expect((await post("/events/ingest", { id: "r2", fields: { Event_Type: "Note", Master_ID: "M1" } }, clinicalCookie)).status).toBe(403);
    expect((await post("/events/batch", { records: [] }, clinicalCookie)).status).toBe(403);
  });

  test("patients can only query and write their own master record", async () => {
    const patientCookie = await seedUser("patient", "M1");
    await events.save({
      uid: "OWN",
      masterId: "M1",
      eventType: "Note",
      eventDate: null,
      payload: { id: "r", fields: {} },
    });
    await events.save({
      uid: "OTHER",
      masterId: "M2",
      eventType: "Note",
      eventDate: null,
      payload: { id: "r2", fields: {} },
    });

    const query = await (await get("/events/query?masterId=M2", patientCookie)).json();
    expect(query.events.map((e: { masterId: string }) => e.masterId)).toEqual(["M1"]);
    expect((await get("/events/OTHER", patientCookie)).status).toBe(404);
    expect((await get("/events/OWN", patientCookie)).status).toBe(200);

    const created = await post(
      "/events/ingest",
      { id: "r3", fields: { Event_Type: "Note", Event_UID: "NEW", Master_ID: "M2" } },
      patientCookie,
    );
    expect(created.status).toBe(201);
    expect((await created.json()).masterId).toBe("M1");
    expect((await post(
      "/events/ingest",
      { id: "r4", fields: { Event_Type: "Note", Event_UID: "OTHER", Master_ID: "M2" } },
      patientCookie,
    )).status).toBe(403);
    expect((await events.getByUid("OTHER"))?.masterId).toBe("M2");
  });

  test("requests from a different browser origin are rejected", async () => {
    const res = await post("/auth/login", { email: "nobody@example.test" }, undefined, "https://evil.example");
    expect(res.status).toBe(403);
  });

  test("invalid login requests return 400 without echoing submitted data", async () => {
    const res = await post("/auth/login", { email: "not-an-email", unexpected: "sensitive" });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid request body" });
  });
});
