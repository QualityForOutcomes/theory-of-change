type User = {
    id: string;
    email: string;
    password: string;           
    firstName?: string;
    lastName?: string;
    org?: string;
    createdAt: string;
    updatedAt: string;
  };
  
  const users = new Map<string, User>();
  
  function nowISO() { return new Date().toISOString(); }
  function makeId() { return "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function sanitize(u: User) { const { password, ...rest } = u; return rest as { id: string; email: string } & Omit<User, "password">; }
  
  /**
    Create a user . Stores password in plain text (for LOCAL DEV ONLY).
   */
  export async function createUser(input: {
    email: string; password: string; firstName?: string; lastName?: string; org?: string;
  }) {
    const email = input.email.toLowerCase();
    if (users.has(email)) throw new Error("EMAIL_TAKEN");
  
    const user: User = {
      id: makeId(),
      email,
      password: input.password,          // no hashing in the browser mock
      firstName: input.firstName,
      lastName: input.lastName,
      org: input.org,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    users.set(email, user);
    return sanitize(user);
  }
  
  /**
   * Verify login (mock). Simple string comparison.
   */
  export async function verifyLogin(emailRaw: string, password: string) {
    const email = emailRaw.toLowerCase();
    const user = users.get(email);
    if (!user || user.password !== password) throw new Error("INVALID_CREDENTIALS");
    user.updatedAt = nowISO();
    return sanitize(user);
  }
  
  /**
   * Fake token generator (no JWT).
   */
  export function signToken(user: { id: string; email: string }) {
    // lightweight “token” with expiry encoded; NOT secure 
    const payload = { sub: user.id, email: user.email, exp: Date.now() + 60 * 60 * 1000 };
    return typeof btoa === "function"
      ? btoa(JSON.stringify(payload))
      : `dev-token-${user.id}-${Date.now()}`;
  }
  
  // Seed a demo user for quick testing: demo@example.com / secret123
  (() => {
    const demoEmail = "demo@example.com";
    if (!users.has(demoEmail)) {
      users.set(demoEmail, {
        id: makeId(),
        email: demoEmail,
        password: "Secret@123",
        firstName: "Demo",
        lastName: "User",
        createdAt: nowISO(),
        updatedAt: nowISO(),
      });
    }
  })();
  