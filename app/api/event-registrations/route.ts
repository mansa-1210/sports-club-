import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { eventRegistrations, events } from "@/lib/db/schema";
import { recordActivity } from "@/lib/server/activity";
import { ApiError, assertSameOrigin, errorResponse, json, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { eventRegistrationSchema } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const profile = await requireUser();
    const { eventId } = await readJson(request, eventRegistrationSchema);

    const registration = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${eventId})`);
      const [event] = await tx
        .select({ id: events.id, capacity: events.capacity, status: events.status, startsAt: events.startsAt, registrationDeadline: events.registrationDeadline })
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);
      const now = new Date();
      if (
        !event ||
        event.status !== "scheduled" ||
        event.startsAt <= now ||
        (event.registrationDeadline && event.registrationDeadline <= now)
      ) {
        throw new ApiError(404, "That event is not accepting registrations.", "EVENT_NOT_FOUND");
      }

      const [existing] = await tx
        .select({ id: eventRegistrations.id, status: eventRegistrations.status })
        .from(eventRegistrations)
        .where(and(eq(eventRegistrations.userId, profile.userId), eq(eventRegistrations.eventId, event.id)))
        .limit(1);
      if (existing && existing.status !== "cancelled") {
        throw new ApiError(409, "You already have a registration for this event.", "REGISTRATION_EXISTS");
      }

      const [countRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(eventRegistrations)
        .where(and(eq(eventRegistrations.eventId, event.id), inArray(eventRegistrations.status, ["pending", "confirmed"])));
      const status = (countRow?.count ?? 0) >= event.capacity ? "waitlisted" : "pending";

      if (existing) {
        const [updated] = await tx
          .update(eventRegistrations)
          .set({ status, updatedAt: new Date() })
          .where(and(eq(eventRegistrations.id, existing.id), eq(eventRegistrations.userId, profile.userId)))
          .returning({ id: eventRegistrations.id, status: eventRegistrations.status });
        return updated;
      }

      const [created] = await tx
        .insert(eventRegistrations)
        .values({ userId: profile.userId, eventId: event.id, status })
        .returning({ id: eventRegistrations.id, status: eventRegistrations.status });
      return created;
    });

    await recordActivity(profile.userId, "event_registration_requested", "event_registration", registration.id).catch((error) =>
      console.error("[v0] Event activity logging failed", error),
    );
    revalidatePath("/account");
    revalidatePath("/admin");
    return json(
      {
        registration,
        message: registration.status === "waitlisted" ? "You are on the waitlist for this event." : "Your event registration is awaiting club confirmation.",
      },
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
