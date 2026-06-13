import { toErrorResponse } from "@/lib/api-error";
import { searchLocations } from "@/lib/open-meteo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query") ?? "";
    const locations = await searchLocations(query);

    return Response.json({ locations });
  } catch (error) {
    return toErrorResponse(error);
  }
}
