import { getHomeData } from "@/lib/server/home-data";
import { errorResponse, json } from "@/lib/server/http";

export async function GET() {
  try {
    const data = await getHomeData();
    return json({ sports: data.sports });
  } catch (error) {
    return errorResponse(error);
  }
}
