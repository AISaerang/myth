import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/lib/permissions";
import { isAdmin } from "@/lib/permissions";
import { SESSION_COOKIE_NAME } from "@/lib/session-token";
import { findSessionUser } from "@server/services/session-service";

// Path alias @server -> ./server (see tsconfig.json).
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return findSessionUser(token);
}

// Page guard: must be logged in with a fresh (non-temporary) password.
export async function requireFreshUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  return user;
}

// Page guard: admin area.
export async function requireAdminUser(): Promise<SessionUser> {
  const user = await requireFreshUser();
  if (!isAdmin(user)) redirect("/dashboard");
  return user;
}

// Action guard: returns the user or throws a generic authorization error.
// Never leak which check failed.
export async function requireActionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireActionAdmin(): Promise<SessionUser> {
  const user = await requireActionUser();
  if (!isAdmin(user)) throw new Error("Forbidden");
  return user;
}
