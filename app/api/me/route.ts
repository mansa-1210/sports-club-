import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clubProfiles } from "@/lib/db/schema";
import { recordActivity } from "@/lib/server/activity";
import { ApiError, assertSameOrigin, errorResponse, json, readJson } from "@/lib/server/http";
import { getCurrentProfile, requireUser } from "@/lib/server/session";
import { profileUpdateSchema } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json({ profile: await getCurrentProfile() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const profile = await requireUser();
    const body = await readJson(request, profileUpdateSchema);
    const [updated] = await db
      .update(clubProfiles)
      .set({ fullName: body.fullName, phone: body.phone || null, updatedAt: new Date() })
      .where(eq(clubProfiles.userId, profile.userId))
      .returning();

    if (!updated) throw new ApiError(404, "Profile not found.", "NOT_FOUND");
    await recordActivity(profile.userId, "profile_updated", "club_profile").catch((error) =>
      console.error("[v0] Profile activity logging failed", error),
    );
    revalidatePath("/account");
    return json({ profile: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
