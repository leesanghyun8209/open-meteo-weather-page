import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { insertWeatherQuery, getRecentWeatherQueries, resetDatabaseConnectionForTests } from "../lib/weather-db.ts";
import type { WeatherResult } from "../lib/weather-types.ts";

test("SQLite stores successful weather lookups and returns latest 10", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "weather-db-"));
  process.env.WEATHER_DB_PATH = path.join(tmpDir, "weather.sqlite");
  resetDatabaseConnectionForTests();

  for (let index = 0; index < 12; index += 1) {
    insertWeatherQuery(makeResult(index));
  }

  const rows = getRecentWeatherQueries();
  assert.equal(rows.length, 10);
  assert.equal(rows[0].displayName, "City 11");
  assert.equal(rows[9].displayName, "City 2");

  resetDatabaseConnectionForTests();
  delete process.env.WEATHER_DB_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("SQLite connection reopens when database file was removed during dev", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "weather-db-removed-"));
  process.env.WEATHER_DB_PATH = path.join(tmpDir, "weather.sqlite");
  resetDatabaseConnectionForTests();

  insertWeatherQuery(makeResult(1));
  fs.rmSync(process.env.WEATHER_DB_PATH);

  insertWeatherQuery(makeResult(2));
  const rows = getRecentWeatherQueries();

  assert.equal(rows.length, 1);
  assert.equal(rows[0].displayName, "City 2");

  resetDatabaseConnectionForTests();
  delete process.env.WEATHER_DB_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeResult(index: number): WeatherResult {
  return {
    mode: "today",
    apiSource: "forecast",
    locationSource: "city_search",
    displayName: `City ${index}`,
    latitude: 37 + index / 100,
    longitude: 127 + index / 100,
    requestedDate: "2026-06-13",
    temperatureCurrent: 20 + index,
    temperatureMax: 25 + index,
    temperatureMin: 18 + index,
    weatherCode: 0,
    precipitationSum: 0,
    windSpeedMax: 10,
    relativeHumidity: 50,
    apparentTemperature: 21,
    rawResponse: { index },
  };
}
