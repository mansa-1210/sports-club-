import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AccountWorkspace } from "@/components/account-workspace";
import { db } from "@/lib/db";
import { clubProfiles, eventRegistrations, events, membershipPlans, memberships, programRegistrations, programSessions, programs, sports, userActivity } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/");

  const [membershipRows, programRows, eventRows, activityRows] = await Promise.all([
    db
      .select({ id: memberships.id, status: memberships.status, paymentStatus: memberships.paymentStatus, startsAt: memberships.startsAt, endsAt: memberships.endsAt, createdAt: memberships.createdAt, planName: membershipPlans.name, priceMinor: membershipPlans.priceMinor, currency: membershipPlans.currency })
      .from(memberships)
      .innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
      .where(eq(memberships.userId, profile.userId))
      .orderBy(desc(memberships.createdAt)),
    db
      .select({ id: programRegistrations.id, status: programRegistrations.status, createdAt: programRegistrations.createdAt, startsAt: programSessions.startsAt, endsAt: programSessions.endsAt, location: programSessions.location, programTitle: programs.title, sportName: sports.name })
      .from(programRegistrations)
      .innerJoin(programSessions, eq(programRegistrations.sessionId, programSessions.id))
      .innerJoin(programs, eq(programSessions.programId, programs.id))
      .innerJoin(sports, eq(programs.sportId, sports.id))
      .where(eq(programRegistrations.userId, profile.userId))
      .orderBy(desc(programSessions.startsAt)),
    db
      .select({ id: eventRegistrations.id, status: eventRegistrations.status, createdAt: eventRegistrations.createdAt, startsAt: events.startsAt, location: events.location, eventTitle: events.title })
      .from(eventRegistrations)
      .innerJoin(events, eq(eventRegistrations.eventId, events.id))
      .where(eq(eventRegistrations.userId, profile.userId))
      .orderBy(desc(events.startsAt)),
    db
      .select({ id: userActivity.id, action: userActivity.action, entityType: userActivity.entityType, createdAt: userActivity.createdAt })
      .from(userActivity)
      .where(eq(userActivity.userId, profile.userId))
      .orderBy(desc(userActivity.createdAt))
      .limit(12),
  ]);

  return (
    <AccountWorkspace
      profile={{ userId: profile.userId, fullName: profile.fullName, email: profile.email, phone: profile.phone, role: profile.role }}
      memberships={membershipRows}
      programRegistrations={programRows}
      eventRegistrations={eventRows}
      activities={activityRows}
    />
  );
}
