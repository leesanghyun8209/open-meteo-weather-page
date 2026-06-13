import { fetchWeather } from "./open-meteo";
import { insertWeatherQuery } from "./weather-db";
import type { WeatherRequest, WeatherResult } from "./weather-types";

export async function fetchAndStoreWeather(request: WeatherRequest): Promise<WeatherResult> {
  const result = await fetchWeather(request);
  insertWeatherQuery(result);
  return result;
}
