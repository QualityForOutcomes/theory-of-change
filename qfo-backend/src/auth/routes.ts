import { Router } from "express";
import { registerSchema, loginSchema } from "./schema";
import { createUser, verifyLogin, signToken } from "./service.memory";
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
