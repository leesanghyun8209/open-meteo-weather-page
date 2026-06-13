import { AppError } from "./api-error";
import { validateWeatherDate } from "./date-rules";
import type { LocationSearchResult, WeatherRequest, WeatherResult } from "./weather-types";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

type OpenMeteoDaily = {
  time?: string[];
  weather_code?: Array<number | null>;
  temperature_2m_max?: Array<number | null>;
  temperature_2m_min?: Array<number | null>;
  precipitation_sum?: Array<number | null>;
  wind_speed_10m_max?: Array<number | null>;
};

type OpenMeteoCurrent = {
  temperature_2m?: number | null;
  relative_humidity_2m?: number | null;
  apparent_temperature?: number | null;
  weather_code?: number | null;
  wind_speed_10m?: number | null;
};

type OpenMeteoWeatherResponse = {
  daily?: OpenMeteoDaily;
  current?: OpenMeteoCurrent;
  reason?: string;
  error?: boolean;
};

type OpenMeteoGeocodingResponse = {
  results?: Array<{
    id: number;
    name: string;
    country: string;
    admin1?: string;
    latitude: number;
    longitude: number;
  }>;
  reason?: string;
  error?: boolean;
};

export async function searchLocations(query: string): Promise<LocationSearchResult[]> {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    throw new AppError("지역 검색어는 두 글자 이상 입력해 주세요.", 400, "SHORT_QUERY");
  }

  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", trimmedQuery);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "ko");
  url.searchParams.set("format", "json");

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new AppError("지역 검색 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", 502, "GEOCODING_FAILED");
  }

  const data = (await response.json()) as OpenMeteoGeocodingResponse;

  if (data.error) {
    throw new AppError(data.reason ?? "지역 검색 요청이 거부되었습니다.", 502, "GEOCODING_FAILED");
  }

  return (data.results ?? []).map((result) => ({
    id: result.id,
    name: result.name,
    country: result.country,
    admin1: result.admin1,
    latitude: result.latitude,
    longitude: result.longitude,
    displayName: [result.name, result.admin1, result.country].filter(Boolean).join(", "),
  }));
}

export async function fetchWeather(request: WeatherRequest): Promise<WeatherResult> {
  validateWeatherRequest(request);

  const validation = validateWeatherDate(request.mode, request.date);

  if (!validation.ok) {
    throw new AppError(validation.message, validation.status, "DATE_OUT_OF_RANGE");
  }

  const apiSource = validation.apiSource;
  const url = new URL(apiSource === "forecast" ? FORECAST_URL : ARCHIVE_URL);

  url.searchParams.set("latitude", String(request.latitude));
  url.searchParams.set("longitude", String(request.longitude));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", request.date);
  url.searchParams.set("end_date", request.date);
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
  );

  if (apiSource === "forecast") {
    url.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    );

    // Date validation enforces the 16-day forecast window. Open-Meteo rejects
    // forecast_days when explicit start_date/end_date are present.
  }

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new AppError("날씨 API에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", 502, "WEATHER_API_FAILED");
  }

  const data = (await response.json()) as OpenMeteoWeatherResponse;

  if (data.error) {
    throw new AppError(data.reason ?? "날씨 API 요청이 거부되었습니다.", 502, "WEATHER_API_FAILED");
  }

  const dayIndex = data.daily?.time?.findIndex((date) => date === request.date) ?? -1;

  if (dayIndex < 0) {
    throw new AppError(
      "선택한 날짜의 관측/재분석 데이터가 아직 제공되지 않습니다. 다른 날짜를 선택해 주세요.",
      404,
      "NO_WEATHER_DATA",
    );
  }

  const weatherCode = numberOrNull(data.daily?.weather_code?.[dayIndex]);

  return {
    mode: request.mode,
    apiSource,
    locationSource: request.locationSource ?? "map_click",
    displayName: request.displayName.trim() || "Selected location",
    latitude: request.latitude,
    longitude: request.longitude,
    requestedDate: request.date,
    temperatureCurrent: request.mode === "today" ? numberOrNull(data.current?.temperature_2m) : null,
    temperatureMax: numberOrNull(data.daily?.temperature_2m_max?.[dayIndex]),
    temperatureMin: numberOrNull(data.daily?.temperature_2m_min?.[dayIndex]),
    weatherCode: request.mode === "today" ? numberOrNull(data.current?.weather_code) ?? weatherCode : weatherCode,
    precipitationSum: numberOrNull(data.daily?.precipitation_sum?.[dayIndex]),
    windSpeedMax:
      request.mode === "today"
        ? numberOrNull(data.current?.wind_speed_10m) ?? numberOrNull(data.daily?.wind_speed_10m_max?.[dayIndex])
        : numberOrNull(data.daily?.wind_speed_10m_max?.[dayIndex]),
    relativeHumidity: request.mode === "today" ? numberOrNull(data.current?.relative_humidity_2m) : null,
    apparentTemperature: request.mode === "today" ? numberOrNull(data.current?.apparent_temperature) : null,
    rawResponse: data,
  };
}

function validateWeatherRequest(request: WeatherRequest) {
  if (!Number.isFinite(request.latitude) || request.latitude < -90 || request.latitude > 90) {
    throw new AppError("위도 값이 올바르지 않습니다.", 400, "INVALID_LATITUDE");
  }

  if (!Number.isFinite(request.longitude) || request.longitude < -180 || request.longitude > 180) {
    throw new AppError("경도 값이 올바르지 않습니다.", 400, "INVALID_LONGITUDE");
  }

  if (!["past", "today", "future"].includes(request.mode)) {
    throw new AppError("조회 모드가 올바르지 않습니다.", 400, "INVALID_MODE");
  }
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
