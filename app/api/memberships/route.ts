import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { membershipPlans, memberships } from "@/lib/db/schema";
import { recordActivity } from "@/lib/server/activity";
import { ApiError, assertSameOrigin, errorResponse, json, readJson } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { membershipCreateSchema } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await requireUser();
    const rows = await db
      .select({
        id: memberships.id,
        status: memberships.status,
        paymentStatus: memberships.paymentStatus,
        paymentReference: memberships.paymentReference,
        startsAt: memberships.startsAt,
        endsAt: memberships.endsAt,
        createdAt: memberships.createdAt,
        planName: membershipPlans.name,
        planDescription: membershipPlans.description,
        priceMinor: membershipPlans.priceMinor,
        currency: membershipPlans.currency,
        durationDays: membershipPlans.durationDays,
      })
      .from(memberships)
      .innerJoin(membershipPlans, eq(memberships.planId, membershipPlans.id))
      .where(eq(memberships.userId, profile.userId))
      .orderBy(desc(memberships.createdAt));
    return json({ memberships: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const profile = await requireUser();
    const body = await readJson(request, membershipCreateSchema);
    const [plan] = await db
      .select({ id: membershipPlans.id })
      .from(membershipPlans)
      .where(and(eq(membershipPlans.id, body.planId), eq(membershipPlans.isActive, true)))
      .limit(1);
    if (!plan) throw new ApiError(404, "That membership plan is no longer available.", "PLAN_NOT_FOUND");

    const [existing] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.userId, profile.userId), inArray(memberships.status, ["pending_payment", "active"])))
      .limit(1);
    if (existing) throw new ApiError(409, "You already have an active or pending membership request.", "MEMBERSHIP_EXISTS");

    const [membership] = await db
      .insert(memberships)
      .values({ userId: profile.userId, planId: plan.id, status: "pending_payment", paymentStatus: "pending" })
      .returning({ id: memberships.id, status: memberships.status, createdAt: memberships.createdAt });

    await recordActivity(profile.userId, "membership_requested", "membership", membership.id).catch((error) =>
      console.error("[v0] Membership activity logging failed", error),
    );
    revalidatePath("/account");
    revalidatePath("/admin");
    return json(
      {
        membership,
        message: "Your membership request is saved. The club will confirm payment offline; no charge was collected.",
      },
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
