import { redirect } from "next/navigation";
import { AdminWorkspace } from "@/components/admin-workspace";
import { getCurrentProfile } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/");
  if (profile.role !== "admin") redirect("/account");
  return <AdminWorkspace fullName={profile.fullName} />;
}
