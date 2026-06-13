import type { WeatherMode } from "./date-rules";

export type LocationSource =
  | "browser_location"
  | "map_click"
  | "city_search"
  | "history_click";

export type ApiSource = "forecast" | "archive";

export type WeatherRequest = {
  latitude: number;
  longitude: number;
  displayName: string;
  date: string;
  mode: WeatherMode;
  locationSource?: LocationSource;
};

export type WeatherResult = {
  mode: WeatherMode;
  apiSource: ApiSource;
  locationSource: LocationSource;
  displayName: string;
  latitude: number;
  longitude: number;
  requestedDate: string;
  temperatureCurrent: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  weatherCode: number | null;
  precipitationSum: number | null;
  windSpeedMax: number | null;
  relativeHumidity: number | null;
  apparentTemperature: number | null;
  rawResponse: unknown;
};

export type WeatherHistoryItem = {
  id: number;
  queryMode: WeatherMode;
  locationSource: LocationSource;
  displayName: string;
  latitude: number;
  longitude: number;
  requestedDate: string;
  apiSource: ApiSource;
  temperatureCurrent: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  weatherCode: number | null;
  precipitationSum: number | null;
  windSpeedMax: number | null;
  createdAt: string;
};

export type LocationSearchResult = {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  displayName: string;
};
