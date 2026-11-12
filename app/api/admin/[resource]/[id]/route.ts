import { and, eq, inArray, ne, sql } from "drizzle-orm";
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
import {
  coachSchema,
  enquiryUpdateSchema,
  eventSchema,
  membershipPlanSchema,
  membershipUpdateSchema,
  programSchema,
  registrationUpdateSchema,
  sessionSchema,
  sportSchema,
  userRoleSchema,
} from "@/lib/server/validation";

type RouteContext = { params: Promise<{ resource: string; id: string }> };

async function updateRegistration(resource: string, id: number, status: string) {
  if (resource === "program-registrations") {
    return db.transaction(async (tx) => {
      const [current] = await tx.select({ id: programRegistrations.id, sessionId: programRegistrations.sessionId }).from(programRegistrations).where(eq(programRegistrations.id, id)).limit(1);
      if (!current) throw new ApiError(404, "Registration not found.", "NOT_FOUND");
      if (status === "pending" || status === "confirmed") {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${current.sessionId})`);
        const [session] = await tx.select({ capacity: programSessions.capacity }).from(programSessions).where(eq(programSessions.id, current.sessionId)).limit(1);
        if (!session) throw new ApiError(404, "Session not found.", "NOT_FOUND");
        const [countRow] = await tx.select({ count: sql<number>`count(*)::int` }).from(programRegistrations).where(and(eq(programRegistrations.sessionId, current.sessionId), ne(programRegistrations.id, id), inArray(programRegistrations.status, ["pending", "confirmed"])));
        if ((countRow?.count ?? 0) >= session.capacity) throw new ApiError(409, "There are no remaining places in this session.", "SESSION_FULL");
      }
      const [updated] = await tx.update(programRegistrations).set({ status, updatedAt: new Date() }).where(eq(programRegistrations.id, id)).returning();
      return updated;
    });
  }

  return db.transaction(async (tx) => {
    const [current] = await tx.select({ id: eventRegistrations.id, eventId: eventRegistrations.eventId }).from(eventRegistrations).where(eq(eventRegistrations.id, id)).limit(1);
    if (!current) throw new ApiError(404, "Registration not found.", "NOT_FOUND");
    if (status === "pending" || status === "confirmed") {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${current.eventId})`);
      const [event] = await tx.select({ capacity: events.capacity }).from(events).where(eq(events.id, current.eventId)).limit(1);
      if (!event) throw new ApiError(404, "Event not found.", "NOT_FOUND");
      const [countRow] = await tx.select({ count: sql<number>`count(*)::int` }).from(eventRegistrations).where(and(eq(eventRegistrations.eventId, current.eventId), ne(eventRegistrations.id, id), inArray(eventRegistrations.status, ["pending", "confirmed"])));
      if ((countRow?.count ?? 0) >= event.capacity) throw new ApiError(409, "There are no remaining places in this event.", "EVENT_FULL");
    }
    const [updated] = await tx.update(eventRegistrations).set({ status, updatedAt: new Date() }).where(eq(eventRegistrations.id, id)).returning();
    return updated;
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { resource, id: rawId } = await context.params;
    const isUser = resource === "users";
    const numericId = Number(rawId);
    const id: string | number = isUser ? rawId : numericId;
    if (!isUser && (!Number.isSafeInteger(numericId) || numericId < 1)) throw new ApiError(400, "Invalid record identifier.", "INVALID_ID");
    let item: unknown;

    switch (resource) {
      case "sports": {
        const body = await readJson(request, sportSchema.partial());
        [item] = await db.update(sports).set({ ...body, updatedAt: new Date() }).where(eq(sports.id, id as number)).returning();
        break;
      }
      case "coaches": {
        const body = await readJson(request, coachSchema.partial());
        [item] = await db.update(coaches).set({ ...body, email: body.email ? body.email.trim().toLowerCase() : body.email === "" ? null : undefined, phone: body.phone ? body.phone : body.phone === "" ? null : undefined, imageUrl: body.imageUrl || undefined, updatedAt: new Date() }).where(eq(coaches.id, id as number)).returning();
        break;
      }
      case "programs": {
        const body = await readJson(request, programSchema.partial());
        [item] = await db.update(programs).set({ ...body, updatedAt: new Date() }).where(eq(programs.id, id as number)).returning();
        break;
      }
      case "sessions": {
        const body = await readJson(request, sessionSchema.partial());
        [item] = await db.update(programSessions).set({ ...body, updatedAt: new Date() }).where(eq(programSessions.id, id as number)).returning();
        break;
      }
      case "plans": {
        const body = await readJson(request, membershipPlanSchema.partial());
        [item] = await db.update(membershipPlans).set({ ...body, updatedAt: new Date() }).where(eq(membershipPlans.id, id as number)).returning();
        break;
      }
      case "events": {
        const body = await readJson(request, eventSchema.partial());
        [item] = await db.update(events).set({ ...body, updatedAt: new Date() }).where(eq(events.id, id as number)).returning();
        break;
      }
      case "users": {
        const body = await readJson(request, userRoleSchema);
        const [target] = await db.select({ userId: clubProfiles.userId, role: clubProfiles.role }).from(clubProfiles).where(eq(clubProfiles.userId, id as string)).limit(1);
        if (!target) throw new ApiError(404, "Member not found.", "NOT_FOUND");
        if (target.role === "admin" && body.role !== "admin") {
          const [admins] = await db.select({ count: sql<number>`count(*)::int` }).from(clubProfiles).where(eq(clubProfiles.role, "admin"));
          if ((admins?.count ?? 0) <= 1) throw new ApiError(409, "The club must keep at least one administrator.", "LAST_ADMIN");
        }
        [item] = await db.update(clubProfiles).set({ role: body.role, updatedAt: new Date() }).where(eq(clubProfiles.userId, id as string)).returning({ userId: clubProfiles.userId, role: clubProfiles.role });
        break;
      }
      case "memberships": {
        const body = await readJson(request, membershipUpdateSchema);
        const [current] = await db.select({ id: memberships.id, status: memberships.status, paymentStatus: memberships.paymentStatus, startsAt: memberships.startsAt, planId: memberships.planId, durationDays: membershipPlans.durationDays }).from(memberships).innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id)).where(eq(memberships.id, id as number)).limit(1);
        if (!current) throw new ApiError(404, "Membership request not found.", "NOT_FOUND");
        const nextPaymentStatus = body.paymentStatus ?? current.paymentStatus;
        if (body.status === "active" && nextPaymentStatus !== "offline_verified") {
          throw new ApiError(422, "Verify the offline payment before activating this membership.", "PAYMENT_NOT_VERIFIED");
        }
        const set: Partial<typeof memberships.$inferInsert> = { ...body, paymentReference: body.paymentReference === "" ? null : body.paymentReference, updatedAt: new Date() };
        if (body.status === "active" && current.status !== "active") {
          const startsAt = new Date();
          set.startsAt = startsAt;
          set.endsAt = new Date(startsAt.getTime() + current.durationDays * 24 * 60 * 60 * 1000);
        }
        [item] = await db.update(memberships).set(set).where(eq(memberships.id, id as number)).returning();
        break;
      }
      case "program-registrations":
      case "event-registrations": {
        const body = await readJson(request, registrationUpdateSchema);
        item = await updateRegistration(resource, id as number, body.status);
        break;
      }
      case "enquiries": {
        const body = await readJson(request, enquiryUpdateSchema);
        [item] = await db.update(contactEnquiries).set({ ...body, updatedAt: new Date() }).where(eq(contactEnquiries.id, id as number)).returning();
        break;
      }
      default:
        throw new ApiError(404, "That admin resource does not exist.", "NOT_FOUND");
    }

    if (!item) throw new ApiError(404, "Record not found.", "NOT_FOUND");
    await recordActivity(admin.userId, "admin_record_updated", resource, isUser ? (item as { userId: string }).userId : id).catch((error) =>
      console.error("[v0] Admin activity logging failed", error),
    );
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/account");
    return json({ item });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { resource, id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id < 1) throw new ApiError(400, "Invalid record identifier.", "INVALID_ID");
    let item: unknown;
    const updatedAt = new Date();

    switch (resource) {
      case "sports":
        [item] = await db.update(sports).set({ isActive: false, updatedAt }).where(eq(sports.id, id)).returning({ id: sports.id });
        break;
      case "coaches":
        [item] = await db.update(coaches).set({ isActive: false, updatedAt }).where(eq(coaches.id, id)).returning({ id: coaches.id });
        break;
      case "programs":
        [item] = await db.update(programs).set({ status: "archived", updatedAt }).where(eq(programs.id, id)).returning({ id: programs.id });
        break;
      case "sessions":
        [item] = await db.update(programSessions).set({ status: "cancelled", updatedAt }).where(eq(programSessions.id, id)).returning({ id: programSessions.id });
        break;
      case "plans":
        [item] = await db.update(membershipPlans).set({ isActive: false, updatedAt }).where(eq(membershipPlans.id, id)).returning({ id: membershipPlans.id });
        break;
      case "events":
        [item] = await db.update(events).set({ status: "cancelled", updatedAt }).where(eq(events.id, id)).returning({ id: events.id });
        break;
      case "memberships":
        [item] = await db.update(memberships).set({ status: "cancelled", updatedAt }).where(eq(memberships.id, id)).returning({ id: memberships.id });
        break;
      case "program-registrations":
        [item] = await db.update(programRegistrations).set({ status: "cancelled", updatedAt }).where(eq(programRegistrations.id, id)).returning({ id: programRegistrations.id });
        break;
      case "event-registrations":
        [item] = await db.update(eventRegistrations).set({ status: "cancelled", updatedAt }).where(eq(eventRegistrations.id, id)).returning({ id: eventRegistrations.id });
        break;
      case "enquiries":
        [item] = await db.update(contactEnquiries).set({ status: "resolved", updatedAt }).where(eq(contactEnquiries.id, id)).returning({ id: contactEnquiries.id });
        break;
      default:
        throw new ApiError(405, "This record cannot be removed.", "METHOD_NOT_ALLOWED");
    }

    if (!item) throw new ApiError(404, "Record not found.", "NOT_FOUND");
    await recordActivity(admin.userId, "admin_record_archived", resource, id).catch((error) =>
      console.error("[v0] Admin activity logging failed", error),
    );
    revalidatePath("/");
    revalidatePath("/admin");
    return json({ item, message: "Record archived or cancelled; historical registrations were preserved." });
  } catch (error) {
    return errorResponse(error);
  }
}
