import { getHomeData } from "@/lib/server/home-data";
import { errorResponse, json } from "@/lib/server/http";

export async function GET() {
  try {
    const data = await getHomeData();
    return json({ plans: data.membershipPlans });
  } catch (error) {
    return errorResponse(error);
  }
}
