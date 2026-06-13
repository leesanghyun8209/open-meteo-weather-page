import { toErrorResponse } from "@/lib/api-error";
import { fetchAndStoreWeather } from "@/lib/weather-service";
import type { WeatherRequest } from "@/lib/weather-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as WeatherRequest;
    const weather = await fetchAndStoreWeather(payload);

    return Response.json({ weather });
  } catch (error) {
    return toErrorResponse(error);
  }
}
