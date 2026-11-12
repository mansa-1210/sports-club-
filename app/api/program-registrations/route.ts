import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { programRegistrations, programSessions, programs } from "@/lib/db/schema";
import { recordActivity } from "@/lib/server/activity";
import { ApiError, assertSameOrigin, errorResponse, json, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { programRegistrationSchema } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const profile = await requireUser();
    const { sessionId } = await readJson(request, programRegistrationSchema);

    const registration = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${sessionId})`);
      const [session] = await tx
        .select({ id: programSessions.id, capacity: programSessions.capacity, status: programSessions.status, programStatus: programs.status })
        .from(programSessions)
        .innerJoin(programs, eq(programSessions.programId, programs.id))
        .where(eq(programSessions.id, sessionId))
        .limit(1);

      if (!session || session.status !== "scheduled" || session.programStatus !== "open") {
        throw new ApiError(404, "That programme session is not available.", "SESSION_NOT_FOUND");
      }

      const [existing] = await tx
        .select({ id: programRegistrations.id, status: programRegistrations.status })
        .from(programRegistrations)
        .where(and(eq(programRegistrations.userId, profile.userId), eq(programRegistrations.sessionId, session.id)))
        .limit(1);
      if (existing && existing.status !== "cancelled") {
        throw new ApiError(409, "You already have a registration for this session.", "REGISTRATION_EXISTS");
      }

      const [countRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(programRegistrations)
        .where(and(eq(programRegistrations.sessionId, session.id), inArray(programRegistrations.status, ["pending", "confirmed"])));
      const status = (countRow?.count ?? 0) >= session.capacity ? "waitlisted" : "pending";

      if (existing) {
        const [updated] = await tx
          .update(programRegistrations)
          .set({ status, updatedAt: new Date() })
          .where(and(eq(programRegistrations.id, existing.id), eq(programRegistrations.userId, profile.userId)))
          .returning({ id: programRegistrations.id, status: programRegistrations.status });
        return updated;
      }

      const [created] = await tx
        .insert(programRegistrations)
        .values({ userId: profile.userId, sessionId: session.id, status })
        .returning({ id: programRegistrations.id, status: programRegistrations.status });
      return created;
    });

    await recordActivity(profile.userId, "programme_registration_requested", "program_registration", registration.id).catch((error) =>
      console.error("[v0] Programme activity logging failed", error),
    );
    revalidatePath("/account");
    revalidatePath("/admin");
    return json(
      {
        registration,
        message: registration.status === "waitlisted" ? "You are on the waitlist for this session." : "Your registration is awaiting club confirmation.",
      },
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
