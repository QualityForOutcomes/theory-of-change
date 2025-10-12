export type UserRole = "admin" | "user";

// Base user shape used across auth flows
export type User = {
  userId?: string | number;
  id?: string | number;
  email?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  organisation?: string | null;
  avatarUrl?: string | null;
  displayName?: string | null;
  // Role can be provided by backend as either `userRole` or `role`
  user_role?: string | null; // legacy/camel variants
  userRole?: string | null;
  role?: string | null;
};

// Normalize role value into a strict union
export function determineUserRole(user: User | null | undefined): UserRole {
  const raw = (user?.userRole ?? user?.user_role ?? user?.role ?? "")
    .toString()
    .trim()
    .toLowerCase();
  return raw === "admin" ? "admin" : "user";
}

// Redirect based on user role. Admin goes to admin app; others to the user app.
export function handleRoleBasedRedirect(user: User | null | undefined, nav: (path: string, opts?: any) => void) {
  const role = determineUserRole(user);

  // Admins: send to admin dashboard running on Vite dev server
  if (role === "admin") {
    const envAdmin = (process?.env?.REACT_APP_ADMIN_URL || "http://localhost:5174").trim();
    const base = envAdmin.replace(/\/$/, "");
    const target = `${base}/admin`;
    // Cross-origin redirect to admin app
    window.location.assign(target);
    return;
  }

  // Default: go to user app home
  nav("/", { replace: true });
}