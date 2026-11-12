import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  clubProfiles,
  coaches,
  contactEnquiries,
  eventRegistrations,
  events,
  membershipPlans,
  memberships,
  programRegistrations,
  programs,
  sports,
} from "@/lib/db/schema";
import { errorResponse, json } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const now = new Date();
    const [memberCount, sportCount, coachCount, programCount, eventCount, enquiryCount, membershipCount, activeMembershipCount, programRegistrationCount, programWaitlist, eventWaitlist, recentEnquiries, recentMemberships] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(clubProfiles).where(inArray(clubProfiles.role, ["member", "coach"])),
      db.select({ count: sql<number>`count(*)::int` }).from(sports).where(eq(sports.isActive, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(coaches).where(eq(coaches.isActive, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(programs).where(eq(programs.status, "open")),
      db.select({ count: sql<number>`count(*)::int` }).from(events).where(and(eq(events.status, "scheduled"), gt(events.startsAt, now))),
      db.select({ count: sql<number>`count(*)::int` }).from(contactEnquiries).where(inArray(contactEnquiries.status, ["new", "in_progress"])),
      db.select({ count: sql<number>`count(*)::int` }).from(memberships).where(eq(memberships.status, "pending_payment")),
      db.select({ count: sql<number>`count(*)::int` }).from(memberships).where(eq(memberships.status, "active")),
      db.select({ count: sql<number>`count(*)::int` }).from(programRegistrations).where(inArray(programRegistrations.status, ["pending", "confirmed", "waitlisted"])),
      db.select({ count: sql<number>`count(*)::int` }).from(programRegistrations).where(eq(programRegistrations.status, "waitlisted")),
      db.select({ count: sql<number>`count(*)::int` }).from(eventRegistrations).where(eq(eventRegistrations.status, "waitlisted")),
      db
        .select({ id: contactEnquiries.id, fullName: contactEnquiries.fullName, email: contactEnquiries.email, subject: contactEnquiries.subject, status: contactEnquiries.status, createdAt: contactEnquiries.createdAt })
        .from(contactEnquiries)
        .orderBy(desc(contactEnquiries.createdAt))
        .limit(6),
      db
        .select({ id: memberships.id, fullName: clubProfiles.fullName, email: clubProfiles.email, planName: membershipPlans.name, status: memberships.status, paymentStatus: memberships.paymentStatus, createdAt: memberships.createdAt })
        .from(memberships)
        .innerJoin(clubProfiles, eq(memberships.userId, clubProfiles.userId))
        .innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
        .orderBy(desc(memberships.createdAt))
        .limit(6),
    ]);

    return json({
      metrics: {
        members: memberCount[0]?.count ?? 0,
        sports: sportCount[0]?.count ?? 0,
        coaches: coachCount[0]?.count ?? 0,
        programs: programCount[0]?.count ?? 0,
        upcomingEvents: eventCount[0]?.count ?? 0,
        openEnquiries: enquiryCount[0]?.count ?? 0,
        pendingMemberships: membershipCount[0]?.count ?? 0,
        activeMemberships: activeMembershipCount[0]?.count ?? 0,
        programRegistrations: programRegistrationCount[0]?.count ?? 0,
        waitlisted: (programWaitlist[0]?.count ?? 0) + (eventWaitlist[0]?.count ?? 0),
      },
      recentEnquiries,
      recentMemberships,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
