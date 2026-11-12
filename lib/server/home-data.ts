import "server-only";

import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  clubProfiles,
  coaches,
  events,
  membershipPlans,
  programRegistrations,
  programs,
  programSessions,
  sports,
} from "@/lib/db/schema";

export async function getHomeData() {
  const now = new Date();
  const [sportRows, programRows, planRows, coachRows, eventRows, memberMetric] = await Promise.all([
    db
      .select({
        id: sports.id,
        name: sports.name,
        slug: sports.slug,
        summary: sports.summary,
        description: sports.description,
        imageUrl: sports.imageUrl,
        sortOrder: sports.sortOrder,
        programCount: sql<number>`(
          SELECT count(*)::int FROM programs p
          WHERE p.sport_id = ${sports.id} AND p.status = 'open'
        )`,
      })
      .from(sports)
      .where(eq(sports.isActive, true))
      .orderBy(asc(sports.sortOrder), asc(sports.name)),
    db
      .select({
        id: programs.id,
        sportId: programs.sportId,
        title: programs.title,
        description: programs.description,
        skillLevel: programs.skillLevel,
        priceMinor: programs.priceMinor,
        currency: programs.currency,
        capacity: programs.capacity,
        sportName: sports.name,
        sportSlug: sports.slug,
        coachName: coaches.fullName,
      })
      .from(programs)
      .innerJoin(sports, eq(programs.sportId, sports.id))
      .leftJoin(coaches, eq(programs.coachId, coaches.id))
      .where(and(eq(programs.status, "open"), eq(sports.isActive, true)))
      .orderBy(asc(sports.sortOrder), asc(programs.title)),
    db
      .select({
        id: membershipPlans.id,
        name: membershipPlans.name,
        slug: membershipPlans.slug,
        description: membershipPlans.description,
        priceMinor: membershipPlans.priceMinor,
        currency: membershipPlans.currency,
        durationDays: membershipPlans.durationDays,
        features: membershipPlans.features,
      })
      .from(membershipPlans)
      .where(eq(membershipPlans.isActive, true))
      .orderBy(asc(membershipPlans.priceMinor)),
    db
      .select({
        id: coaches.id,
        fullName: coaches.fullName,
        title: coaches.title,
        bio: coaches.bio,
        imageUrl: coaches.imageUrl,
        sportName: sports.name,
      })
      .from(coaches)
      .leftJoin(sports, eq(coaches.sportId, sports.id))
      .where(eq(coaches.isActive, true))
      .orderBy(asc(coaches.fullName)),
    db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        location: events.location,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
        capacity: events.capacity,
        sportName: sports.name,
        availableSpots: sql<number>`(
          ${events.capacity} - (
            SELECT count(*)::int FROM event_registrations er
            WHERE er.event_id = ${events.id} AND er.status IN ('pending', 'confirmed')
          )
        )`,
      })
      .from(events)
      .leftJoin(sports, eq(events.sportId, sports.id))
      .where(and(eq(events.status, "scheduled"), gt(events.startsAt, now)))
      .orderBy(asc(events.startsAt))
      .limit(4),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(clubProfiles)
      .where(eq(clubProfiles.role, "member")),
  ]);

  const programIds = programRows.map((program) => program.id);
  const sessionRows = programIds.length
    ? await db
        .select({
          id: programSessions.id,
          programId: programSessions.programId,
          startsAt: programSessions.startsAt,
          endsAt: programSessions.endsAt,
          location: programSessions.location,
          capacity: programSessions.capacity,
          coachName: coaches.fullName,
          availableSpots: sql<number>`(
            ${programSessions.capacity} - (
              SELECT count(*)::int FROM program_registrations pr
              WHERE pr.session_id = ${programSessions.id} AND pr.status IN ('pending', 'confirmed')
            )
          )`,
        })
        .from(programSessions)
        .leftJoin(coaches, eq(programSessions.coachId, coaches.id))
        .where(
          and(
            inArray(programSessions.programId, programIds),
            eq(programSessions.status, "scheduled"),
            gt(programSessions.startsAt, now),
          ),
        )
        .orderBy(asc(programSessions.startsAt))
    : [];

  const sessionsByProgram = new Map<number, typeof sessionRows>();
  for (const session of sessionRows) {
    const sessions = sessionsByProgram.get(session.programId) ?? [];
    sessions.push(session);
    sessionsByProgram.set(session.programId, sessions);
  }

  const programsWithSessions = programRows.map((program) => ({
    ...program,
    sessions: sessionsByProgram.get(program.id) ?? [],
  }));

  return {
    sports: sportRows,
    programs: programsWithSessions,
    membershipPlans: planRows,
    coaches: coachRows,
    events: eventRows,
    stats: {
      members: memberMetric[0]?.count ?? 0,
      sports: sportRows.length,
      coaches: coachRows.length,
      programs: programRows.length,
    },
  };
}
