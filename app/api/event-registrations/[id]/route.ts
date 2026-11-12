import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { eventRegistrations, events } from "@/lib/db/schema";
import { recordActivity } from "@/lib/server/activity";
import { ApiError, assertSameOrigin, errorResponse, json } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const profile = await requireUser();
    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id < 1) throw new ApiError(400, "Invalid registration identifier.", "INVALID_ID");

    const [registration] = await db
      .select({ id: eventRegistrations.id, startsAt: events.startsAt })
      .from(eventRegistrations)
      .innerJoin(events, eq(eventRegistrations.eventId, events.id))
      .where(and(eq(eventRegistrations.id, id), eq(eventRegistrations.userId, profile.userId)))
      .limit(1);
    if (!registration) throw new ApiError(404, "Registration not found.", "NOT_FOUND");
    if (registration.startsAt <= new Date()) throw new ApiError(409, "Past or in-progress events cannot be cancelled here.", "EVENT_STARTED");

    const [updated] = await db
      .update(eventRegistrations)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(eventRegistrations.id, id), eq(eventRegistrations.userId, profile.userId)))
      .returning({ id: eventRegistrations.id, status: eventRegistrations.status });

    await recordActivity(profile.userId, "event_registration_cancelled", "event_registration", id).catch((error) =>
      console.error("[v0] Event activity logging failed", error),
    );
    revalidatePath("/account");
    revalidatePath("/");
    return json({ registration: updated, message: "Your registration was cancelled." });
  } catch (error) {
    return errorResponse(error);
  }
}
