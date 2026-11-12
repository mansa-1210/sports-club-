import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { clubProfiles } from "@/lib/db/schema";
import { ApiError } from "@/lib/server/http";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const result = await auth.getSession();
  const user = result.data?.user;
  if (!user?.id || !user.email) return null;
  return { id: user.id, email: user.email, name: user.name };
}

export async function ensureProfile(user: SessionUser) {
  const email = user.email.trim().toLowerCase();
  const fullName = user.name?.trim() || email.split("@")[0] || "Club member";
  const adminEmail = process.env.SPORTS_CLUB_ADMIN_EMAIL?.trim().toLowerCase();
  const isBootstrapAdmin = Boolean(adminEmail && email === adminEmail);

  const [profile] = await db
    .insert(clubProfiles)
    .values({
      userId: user.id,
      email,
      fullName,
      role: isBootstrapAdmin ? "admin" : "member",
    })
    .onConflictDoUpdate({
      target: clubProfiles.userId,
      set: {
        email,
        updatedAt: new Date(),
        ...(isBootstrapAdmin ? { role: "admin" } : {}),
      },
    })
    .returning();

  return profile;
}

export async function getCurrentProfile() {
  const user = await getSessionUser();
  return user ? ensureProfile(user) : null;
}

export async function requireUser() {
  const profile = await getCurrentProfile();
  if (!profile) throw new ApiError(401, "Sign in to continue.", "UNAUTHORIZED");
  return profile;
}

export async function requireAdmin() {
  const profile = await requireUser();
  if (profile.role !== "admin") {
    throw new ApiError(403, "Administrator access is required.", "FORBIDDEN");
  }
  return profile;
}

export async function requireCoach() {
  const profile = await requireUser();
  if (profile.role !== "coach" && profile.role !== "admin") {
    throw new ApiError(403, "Coach access is required.", "FORBIDDEN");
  }
  return profile;
}
