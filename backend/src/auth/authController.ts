import { Request, Response } from "express";
import { AuthService } from "./authService";
import {
  bootstrapSchema,
  createInviteSchema,
  provisionAccountSchema,
  registerPatientSchema,
  requestLoginSchema,
  verifyCodeSchema,
} from "./authSchemas";
import { HttpError } from "../utils/httpError";

function parseBody<T>(schema: { safeParse(input: unknown): { success: true; data: T } | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } } }, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(
      400,
      "Invalid request body",
      result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    );
  }
  return result.data;
}

export function createAuthController(auth: AuthService) {
  return {
    async requestLoginCode(req: Request, res: Response): Promise<void> {
      const { email } = parseBody(requestLoginSchema, req.body);
      await auth.requestLoginCode(email);
      res.status(202).json({ message: "If the address is registered, a sign-in code will be sent." });
    },

    async registerPatient(req: Request, res: Response): Promise<void> {
      const body = parseBody(registerPatientSchema, req.body);
      await auth.requestPatientRegistration(body.email, body.inviteCode);
      res.status(202).json({ message: "If the invite is valid, a sign-in code will be sent." });
    },

    async bootstrap(req: Request, res: Response): Promise<void> {
      const body = parseBody(bootstrapSchema, req.body);
      await auth.requestBootstrap(body.email, body.secret);
      res.status(202).json({ message: "A sign-in code will be sent to the administrator email." });
    },

    async verifyCode(req: Request, res: Response): Promise<void> {
      const body = parseBody(verifyCodeSchema, req.body);
      const result = await auth.verifyCode(body.email, body.code);
      res.setHeader("Set-Cookie", auth.sessionCookie(result.sessionToken, result.expiresAt));
      res.status(200).json({ user: publicUser(result.user) });
    },

    async currentUser(req: Request, res: Response): Promise<void> {
      if (!req.authUser) throw new HttpError(401, "Authentication required");
      res.status(200).json({ user: publicUser(req.authUser) });
    },

    async logout(req: Request, res: Response): Promise<void> {
      await auth.logout(req.authSessionToken);
      res.setHeader("Set-Cookie", auth.clearSessionCookie());
      res.status(204).end();
    },

    async createInvite(req: Request, res: Response): Promise<void> {
      const { masterId } = parseBody(createInviteSchema, req.body);
      const invite = await auth.createPatientInvite(masterId, req.authUser!.id);
      res.status(201).json(invite);
    },

    async provisionAccount(req: Request, res: Response): Promise<void> {
      const body = parseBody(provisionAccountSchema, req.body);
      await auth.provisionAccount(body.email, body.role);
      res.status(202).json({ message: "If delivery succeeds, a sign-in code will be sent." });
    },
  };
}

function publicUser(user: { id: string; email: string; role: string; masterId: string | null }) {
  return { id: user.id, email: user.email, role: user.role, masterId: user.masterId };
}
