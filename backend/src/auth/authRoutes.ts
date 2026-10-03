import { Router } from "express";
import { AuthService } from "./authService";
import { createAuthRequestLimiter, createRequireAuth, requireRoles } from "./authMiddleware";
import { createAuthController } from "./authController";

export function createAuthRouter(auth: AuthService): Router {
  const router = Router();
  const controller = createAuthController(auth);
  const requireAuth = createRequireAuth(auth);
  const limitAuthRequests = createAuthRequestLimiter();

  router.post("/login", limitAuthRequests, controller.requestLoginCode);
  router.post("/register", limitAuthRequests, controller.registerPatient);
  router.post("/bootstrap", limitAuthRequests, controller.bootstrap);
  router.post("/verify", limitAuthRequests, controller.verifyCode);
  router.get("/me", requireAuth, controller.currentUser);
  router.post("/logout", requireAuth, controller.logout);
  router.post("/invites", requireAuth, requireRoles("administrator"), controller.createInvite);
  router.post("/accounts", requireAuth, requireRoles("administrator"), controller.provisionAccount);

  return router;
}
