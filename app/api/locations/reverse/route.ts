import { toErrorResponse } from "@/lib/api-error";
import { reverseGeocode } from "@/lib/reverse-geocode";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const latitude = Number(url.searchParams.get("latitude"));
    const longitude = Number(url.searchParams.get("longitude"));
    const location = await reverseGeocode(latitude, longitude);

    return Response.json({ location });
  } catch (error) {
    return toErrorResponse(error);
  }
}
