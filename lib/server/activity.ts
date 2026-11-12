import { db } from "@/lib/db";
import { userActivity } from "@/lib/db/schema";

export async function recordActivity(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: number | string,
  metadata: Record<string, string | number | boolean | null> = {},
) {
  await db.insert(userActivity).values({
    userId,
    action,
    entityType: entityType ?? null,
    entityId: entityId == null ? null : String(entityId),
    metadata,
  });
}
