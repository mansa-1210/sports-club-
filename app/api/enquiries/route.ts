import { and, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { contactEnquiries } from "@/lib/db/schema";
import { assertSameOrigin, errorResponse, json, readJson } from "@/lib/server/http";
import { getCurrentProfile } from "@/lib/server/session";
import { enquirySchema } from "@/lib/server/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request, enquirySchema);
    const email = body.email.trim().toLowerCase();
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const [recent] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactEnquiries)
      .where(and(eq(contactEnquiries.email, email), gt(contactEnquiries.createdAt, cutoff)));

    if ((recent?.count ?? 0) >= 5) {
      return json({ error: "Please wait before sending another message.", code: "RATE_LIMITED" }, 429);
    }

    const profile = await getCurrentProfile();
    const [enquiry] = await db
      .insert(contactEnquiries)
      .values({
        userId: profile?.userId ?? null,
        fullName: body.fullName,
        email,
        phone: body.phone || null,
        subject: body.subject || null,
        message: body.message,
      })
      .returning({ id: contactEnquiries.id, createdAt: contactEnquiries.createdAt });

    revalidatePath("/admin");
    return json({ enquiry, message: "Thanks for reaching out. The club team will be in touch." }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
