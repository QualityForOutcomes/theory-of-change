import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../env";

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

// In-memory user store (lost on server restart)
const users = new Map<string, User>(); // key: email

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

(async () => {
  const demoEmail = "demo@example.com";
  if (!users.has(demoEmail)) {
    const hash = await bcrypt.hash("secret123", 12);
    users.set(demoEmail, {
      id: makeId(),
      email: demoEmail,
      password: hash,
      firstName: "Demo",
      lastName: "User",
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
    // console.log("Seeded demo user: demo@example.com / secret123");
  }
})();
