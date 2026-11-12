import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userActivity } from "@/lib/db/schema";
import { errorResponse, json } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await requireUser();
    const activities = await db
      .select({ id: userActivity.id, action: userActivity.action, entityType: userActivity.entityType, createdAt: userActivity.createdAt })
      .from(userActivity)
      .where(eq(userActivity.userId, profile.userId))
      .orderBy(desc(userActivity.createdAt))
      .limit(20);
    return json({ activities });
  } catch (error) {
    return errorResponse(error);
  }
}
