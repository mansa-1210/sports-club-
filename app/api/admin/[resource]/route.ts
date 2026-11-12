import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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
  programSessions,
  programs,
  sports,
} from "@/lib/db/schema";
import { recordActivity } from "@/lib/server/activity";
import { ApiError, assertSameOrigin, errorResponse, json, readJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";
import { coachSchema, eventSchema, membershipPlanSchema, programSchema, sessionSchema, sportSchema } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ resource: string }> };

async function readResource(resource: string) {
  switch (resource) {
    case "options": {
      const [sportsRows, coachesRows, programsRows, plansRows] = await Promise.all([
        db.select({ id: sports.id, name: sports.name }).from(sports).where(eq(sports.isActive, true)).orderBy(asc(sports.name)),
        db.select({ id: coaches.id, fullName: coaches.fullName }).from(coaches).where(eq(coaches.isActive, true)).orderBy(asc(coaches.fullName)),
        db.select({ id: programs.id, title: programs.title }).from(programs).where(eq(programs.status, "open")).orderBy(asc(programs.title)),
        db.select({ id: membershipPlans.id, name: membershipPlans.name }).from(membershipPlans).where(eq(membershipPlans.isActive, true)).orderBy(asc(membershipPlans.name)),
      ]);
      return { sports: sportsRows, coaches: coachesRows, programs: programsRows, plans: plansRows };
    }
    case "sports":
      return db.select({ id: sports.id, name: sports.name, slug: sports.slug, summary: sports.summary, description: sports.description, imageUrl: sports.imageUrl, sortOrder: sports.sortOrder, isActive: sports.isActive, createdAt: sports.createdAt }).from(sports).orderBy(asc(sports.sortOrder), asc(sports.name));
    case "coaches":
      return db.select({ id: coaches.id, fullName: coaches.fullName, title: coaches.title, bio: coaches.bio, email: coaches.email, phone: coaches.phone, imageUrl: coaches.imageUrl, sportId: coaches.sportId, sportName: sports.name, isActive: coaches.isActive }).from(coaches).leftJoin(sports, eq(coaches.sportId, sports.id)).orderBy(asc(coaches.fullName));
    case "programs":
      return db.select({ id: programs.id, title: programs.title, description: programs.description, skillLevel: programs.skillLevel, priceMinor: programs.priceMinor, currency: programs.currency, capacity: programs.capacity, status: programs.status, sportId: programs.sportId, sportName: sports.name, coachId: programs.coachId, coachName: coaches.fullName }).from(programs).innerJoin(sports, eq(programs.sportId, sports.id)).leftJoin(coaches, eq(programs.coachId, coaches.id)).orderBy(asc(programs.title));
    case "sessions":
      return db.select({ id: programSessions.id, programId: programSessions.programId, programTitle: programs.title, coachId: programSessions.coachId, startsAt: programSessions.startsAt, endsAt: programSessions.endsAt, location: programSessions.location, capacity: programSessions.capacity, status: programSessions.status }).from(programSessions).innerJoin(programs, eq(programSessions.programId, programs.id)).orderBy(desc(programSessions.startsAt));
    case "plans":
      return db.select({ id: membershipPlans.id, name: membershipPlans.name, slug: membershipPlans.slug, description: membershipPlans.description, priceMinor: membershipPlans.priceMinor, currency: membershipPlans.currency, durationDays: membershipPlans.durationDays, features: membershipPlans.features, isActive: membershipPlans.isActive }).from(membershipPlans).orderBy(asc(membershipPlans.priceMinor));
    case "events":
      return db.select({ id: events.id, title: events.title, description: events.description, location: events.location, startsAt: events.startsAt, endsAt: events.endsAt, registrationDeadline: events.registrationDeadline, capacity: events.capacity, status: events.status, sportId: events.sportId, sportName: sports.name }).from(events).leftJoin(sports, eq(events.sportId, sports.id)).orderBy(desc(events.startsAt));
    case "memberships":
      return db.select({ id: memberships.id, userId: memberships.userId, fullName: clubProfiles.fullName, email: clubProfiles.email, planName: membershipPlans.name, priceMinor: membershipPlans.priceMinor, currency: membershipPlans.currency, durationDays: membershipPlans.durationDays, status: memberships.status, paymentStatus: memberships.paymentStatus, paymentReference: memberships.paymentReference, startsAt: memberships.startsAt, endsAt: memberships.endsAt, createdAt: memberships.createdAt }).from(memberships).innerJoin(clubProfiles, eq(memberships.userId, clubProfiles.userId)).innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id)).orderBy(desc(memberships.createdAt));
    case "users":
      return db.select({ id: clubProfiles.userId, fullName: clubProfiles.fullName, email: clubProfiles.email, phone: clubProfiles.phone, role: clubProfiles.role, createdAt: clubProfiles.createdAt }).from(clubProfiles).orderBy(desc(clubProfiles.createdAt));
    case "program-registrations":
      return db.select({ id: programRegistrations.id, userId: programRegistrations.userId, fullName: clubProfiles.fullName, email: clubProfiles.email, sessionId: programSessions.id, startsAt: programSessions.startsAt, location: programSessions.location, programTitle: programs.title, status: programRegistrations.status, createdAt: programRegistrations.createdAt }).from(programRegistrations).innerJoin(clubProfiles, eq(programRegistrations.userId, clubProfiles.userId)).innerJoin(programSessions, eq(programRegistrations.sessionId, programSessions.id)).innerJoin(programs, eq(programSessions.programId, programs.id)).orderBy(desc(programSessions.startsAt));
    case "event-registrations":
      return db.select({ id: eventRegistrations.id, userId: eventRegistrations.userId, fullName: clubProfiles.fullName, email: clubProfiles.email, eventId: events.id, eventTitle: events.title, startsAt: events.startsAt, status: eventRegistrations.status, createdAt: eventRegistrations.createdAt }).from(eventRegistrations).innerJoin(clubProfiles, eq(eventRegistrations.userId, clubProfiles.userId)).innerJoin(events, eq(eventRegistrations.eventId, events.id)).orderBy(desc(events.startsAt));
    case "enquiries":
      return db.select({ id: contactEnquiries.id, fullName: contactEnquiries.fullName, email: contactEnquiries.email, phone: contactEnquiries.phone, subject: contactEnquiries.subject, message: contactEnquiries.message, status: contactEnquiries.status, adminNote: contactEnquiries.adminNote, createdAt: contactEnquiries.createdAt }).from(contactEnquiries).orderBy(desc(contactEnquiries.createdAt));
    default:
      throw new ApiError(404, "That admin resource does not exist.", "NOT_FOUND");
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { resource } = await context.params;
    return json({ items: await readResource(resource) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { resource } = await context.params;
    let item: unknown;

    switch (resource) {
      case "sports": {
        const body = await readJson(request, sportSchema);
        [item] = await db.insert(sports).values({ ...body, userId: admin.userId }).returning();
        break;
      }
      case "coaches": {
        const body = await readJson(request, coachSchema);
        [item] = await db.insert(coaches).values({ ...body, email: body.email?.trim().toLowerCase() || null, phone: body.phone || null, imageUrl: body.imageUrl || "", userId: admin.userId }).returning();
        break;
      }
      case "programs": {
        const body = await readJson(request, programSchema);
        [item] = await db.insert(programs).values({ ...body, userId: admin.userId }).returning();
        break;
      }
      case "sessions": {
        const body = await readJson(request, sessionSchema);
        [item] = await db.insert(programSessions).values({ ...body, userId: admin.userId }).returning();
        break;
      }
      case "plans": {
        const body = await readJson(request, membershipPlanSchema);
        [item] = await db.insert(membershipPlans).values({ ...body, userId: admin.userId }).returning();
        break;
      }
      case "events": {
        const body = await readJson(request, eventSchema);
        [item] = await db.insert(events).values({ ...body, userId: admin.userId }).returning();
        break;
      }
      default:
        throw new ApiError(405, "Records in this section are created through their own workflow.", "METHOD_NOT_ALLOWED");
    }

    const itemId = item && typeof item === "object" && "id" in item ? (item as { id?: number }).id : undefined;
    await recordActivity(admin.userId, "admin_record_created", resource, itemId).catch((error) =>
      console.error("[v0] Admin activity logging failed", error),
    );
    revalidatePath("/");
    revalidatePath("/admin");
    return json({ item }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
