import { redirect } from "next/navigation";
import { CoachWorkspace } from "@/components/coach-workspace";
import { getCurrentProfile } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/");
  if (profile.role !== "coach" && profile.role !== "admin") redirect("/account");
  return <CoachWorkspace />;
}
