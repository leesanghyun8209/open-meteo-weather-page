import { AppError } from "./api-error";
import { buildAdministrativeDisplayName, coordinateDisplayName } from "./location-display";
import type { ReverseLocationResult } from "./weather-types";

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

type NominatimAddress = Record<string, string | undefined>;

type NominatimReverseResponse = {
  display_name?: string;
  error?: string;
  address?: NominatimAddress;
};

export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseLocationResult> {
  validateCoordinate(latitude, longitude);

  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "ko,en");
  url.searchParams.set("layer", "address");
  url.searchParams.set("zoom", "14");

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "open-meteo-weather-page/0.1 (https://github.com/leesanghyun8209/open-meteo-weather-page)",
    },
  });

  if (!response.ok) {
    throw new AppError("지역명을 확인하지 못했습니다. 좌표 기준으로 계속 진행합니다.", 502, "REVERSE_GEOCODING_FAILED");
  }

  const data = (await response.json()) as NominatimReverseResponse;

  if (data.error) {
    throw new AppError("해당 좌표의 지역명을 찾지 못했습니다. 좌표 기준으로 계속 진행합니다.", 404, "NO_REVERSE_GEOCODE");
  }

  const displayName = buildAdministrativeDisplayName(data.address, data.display_name);

  return {
    displayName: displayName ?? coordinateDisplayName(latitude, longitude),
    latitude,
    longitude,
    fallbackUsed: !displayName,
  };
}

function validateCoordinate(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new AppError("위도 값이 올바르지 않습니다.", 400, "INVALID_LATITUDE");
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new AppError("경도 값이 올바르지 않습니다.", 400, "INVALID_LONGITUDE");
  }
}
