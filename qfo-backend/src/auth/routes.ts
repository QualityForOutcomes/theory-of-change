import { Router } from "express";
import { registerSchema, loginSchema, passwordResetRequestSchema, passwordResetSchema } from "./schema";
import { createUser, verifyLogin, signToken, requestPasswordReset, resetPassword } from "./service.memory";
import { requireAuth } from "./middleware";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const user = await createUser(data);
    const token = signToken(user as any);
    res.status(201).json({ user, token });
  } catch (e: any) {
    if (e?.message === "EMAIL_TAKEN") return res.status(409).json({ error: "That email is already registered." });
    if (e?.issues) return res.status(400).json({ error: "Invalid input", details: e.issues });
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await verifyLogin(email, password);
    const token = signToken(user as any);
    res.json({ user, token });
  } catch (e: any) {
    if (e?.issues) return res.status(400).json({ error: "Invalid input", details: e.issues });
    if (e?.message === "INVALID_CREDENTIALS") return res.status(401).json({ error: "Invalid email or password." });
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

authRouter.get("/me", requireAuth, (req: any, res) => {
  res.json({ user: { id: req.user.sub, email: req.user.email } });
});

authRouter.post("/password-reset", async (req, res) => {
  try {
    // Check if this is a reset request or password reset
    if (req.body.email && !req.body.token) {
      // Password reset request
      const { email } = passwordResetRequestSchema.parse(req.body);
      const result = await requestPasswordReset(email);
      res.json(result);
    } else if (req.body.token && req.body.newPassword) {
      // Password reset with token
      const { token, newPassword } = passwordResetSchema.parse(req.body);
      const result = await resetPassword(token, newPassword);
      res.json(result);
    } else {
      res.status(400).json({ error: "Invalid request. Provide either email for reset request or token with newPassword for reset." });
    }
  } catch (e: any) {
    if (e?.issues) return res.status(400).json({ error: "Valid email is required", details: e.issues });
    if (e?.message === "INVALID_OR_EXPIRED_TOKEN") return res.status(400).json({ error: "Invalid or expired reset code" });
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});
