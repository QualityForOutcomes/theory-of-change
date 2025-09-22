import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { emailService } from "./email.service";

type User = {
  id: string;
  email: string;
  password: string; // bcrypt hash
  firstName?: string;
  lastName?: string;
  org?: string;
  createdAt: string;
  updatedAt: string;
};

type ResetToken = {
  email: string;
  token: string;
  expiresAt: string;
  createdAt: string;
};

// In-memory user store (lost on server restart)
const users = new Map<string, User>(); // key: email
const resetTokens = new Map<string, ResetToken>(); // key: token

function nowISO() { return new Date().toISOString(); }
function sanitize(u: User) {
  const { password, ...rest } = u;
  return rest;
}
function makeId() {
  // simple cuid-ish
  return "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function createUser(input: {
  email: string; password: string; firstName?: string; lastName?: string; org?: string;
}) {
  const email = input.email.toLowerCase();
  if (users.has(email)) throw new Error("EMAIL_TAKEN");

  const hash = await bcrypt.hash(input.password, 12);
  const user: User = {
    id: makeId(),
    email,
    password: hash,
    firstName: input.firstName,
    lastName: input.lastName,
    org: input.org,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  users.set(email, user);
  return sanitize(user);
}

export async function verifyLogin(emailRaw: string, password: string) {
  const email = emailRaw.toLowerCase();
  const user = users.get(email);
  if (!user) throw new Error("INVALID_CREDENTIALS");
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error("INVALID_CREDENTIALS");
  // touch updatedAt
  user.updatedAt = nowISO();
  return sanitize(user);
}

export function signToken(user: { id: string; email: string }) {
  return jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, { expiresIn: "1h" });
}

function generateResetToken() {
  // Generate 8-character alphanumeric token
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function isTokenExpired(expiresAt: string) {
  return new Date() > new Date(expiresAt);
}

export async function requestPasswordReset(emailRaw: string) {
  const email = emailRaw.toLowerCase();
  const user = users.get(email);
  
  // Always return success message for security (don't reveal if email exists)
  if (!user) {
    return { message: "If this email exists, you will receive a reset code" };
  }

  // Generate reset token (expires in 15 minutes)
  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  
  const resetToken: ResetToken = {
    email,
    token,
    expiresAt,
    createdAt: nowISO(),
  };
  
  resetTokens.set(token, resetToken);
  
  // Send password reset email
  try {
    await emailService.sendPasswordResetEmail(email, token);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    // Still return success message for security (don't reveal if email sending failed)
  }
  
  return { message: "If this email exists, you will receive a reset code" };
}

export async function resetPassword(token: string, newPassword: string) {
  const resetToken = resetTokens.get(token);
  
  if (!resetToken || isTokenExpired(resetToken.expiresAt)) {
    throw new Error("INVALID_OR_EXPIRED_TOKEN");
  }
  
  const user = users.get(resetToken.email);
  if (!user) {
    throw new Error("INVALID_OR_EXPIRED_TOKEN");
  }
  
  // Update password
  const hash = await bcrypt.hash(newPassword, 12);
  user.password = hash;
  user.updatedAt = nowISO();
  
  // Remove used token
  resetTokens.delete(token);
  
  return { message: "Password reset successful" };
}

(async () => {
  const demoEmail = "milanghadiya2@gmail.com";
  if (!users.has(demoEmail)) {
    const hash = await bcrypt.hash("secret123", 12);
    users.set(demoEmail, {
      id: makeId(),
      email: demoEmail,
      password: hash,
      firstName: "Milan",
      lastName: "Ghadiya",
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
    // console.log("Seeded demo user: milanghadiya2@gmail.com / secret123");
  }
})();
