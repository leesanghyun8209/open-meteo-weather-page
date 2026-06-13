import { toErrorResponse } from "@/lib/api-error";
import { getRecentWeatherQueries } from "@/lib/weather-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json({ history: getRecentWeatherQueries(10) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
