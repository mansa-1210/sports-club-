import { getHomeData } from "@/lib/server/home-data";
import { errorResponse, json } from "@/lib/server/http";

export async function GET() {
  try {
    const data = await getHomeData();
    return json({ programs: data.programs });
  } catch (error) {
    return errorResponse(error);
  }
}
