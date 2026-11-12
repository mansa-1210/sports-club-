import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { clubProfiles, coaches, programRegistrations, programSessions, programs, sports } from "@/lib/db/schema";
import { ApiError, errorResponse, json } from "@/lib/server/http";
import { requireCoach } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await requireCoach();
    const coachRows = await db
      .select({ id: coaches.id, fullName: coaches.fullName, title: coaches.title, sportName: sports.name })
      .from(coaches)
      .leftJoin(sports, eq(coaches.sportId, sports.id))
      .where(and(eq(coaches.email, profile.email), eq(coaches.isActive, true)))
      .limit(1);
    const coach = coachRows[0];
    if (!coach) throw new ApiError(404, "No active coach profile is linked to this account.", "COACH_PROFILE_NOT_FOUND");

    const sessions = await db
      .select({
        id: programSessions.id,
        startsAt: programSessions.startsAt,
        endsAt: programSessions.endsAt,
        location: programSessions.location,
        capacity: programSessions.capacity,
        status: programSessions.status,
        programTitle: programs.title,
        sportName: sports.name,
      })
      .from(programSessions)
      .innerJoin(programs, eq(programSessions.programId, programs.id))
      .innerJoin(sports, eq(programs.sportId, sports.id))
      .where(and(eq(programSessions.coachId, coach.id), inArray(programSessions.status, ["scheduled", "completed"])))
      .orderBy(asc(programSessions.startsAt))
      .limit(100);

    const sessionIds = sessions.map((session) => session.id);
    const roster = sessionIds.length
      ? await db
          .select({
            id: programRegistrations.id,
            sessionId: programRegistrations.sessionId,
            status: programRegistrations.status,
            fullName: clubProfiles.fullName,
            email: clubProfiles.email,
          })
          .from(programRegistrations)
          .innerJoin(clubProfiles, eq(programRegistrations.userId, clubProfiles.userId))
          .where(inArray(programRegistrations.sessionId, sessionIds))
          .limit(500)
      : [];

    return json({ coach, sessions, roster });
  } catch (error) {
    return errorResponse(error);
  }
}
