import { z } from "zod";

export const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());

export const requestLoginSchema = z.strictObject({ email: emailSchema });

export const registerPatientSchema = z.strictObject({
  email: emailSchema,
  inviteCode: z.string().min(32).max(128),
});

export const bootstrapSchema = z.strictObject({
  email: emailSchema,
  secret: z.string().min(1).max(512),
});

export const verifyCodeSchema = z.strictObject({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/),
});

export const provisionAccountSchema = z.strictObject({
  email: emailSchema,
  role: z.enum(["administrator", "clinical"]),
});

export const createInviteSchema = z.strictObject({
  masterId: z.string().min(1).max(128),
});
