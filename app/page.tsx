import { HomePage } from "@/components/home-page";
import { getHomeData } from "@/lib/server/home-data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getHomeData();
  return <HomePage data={data} />;
}
