import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { WeatherHistoryItem, WeatherResult } from "./weather-types";

type DatabaseSyncInstance = import("node:sqlite").DatabaseSync;

const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync } = nodeRequire("node:sqlite") as {
  DatabaseSync: new (filename: string) => DatabaseSyncInstance;
};

type HistoryRow = {
  id: number;
  query_mode: "past" | "today" | "future";
  location_source: "browser_location" | "map_click" | "city_search" | "history_click";
  display_name: string;
  latitude: number;
  longitude: number;
  requested_date: string;
  api_source: "forecast" | "archive";
  temperature_current: number | null;
  temperature_max: number | null;
  temperature_min: number | null;
  weather_code: number | null;
  precipitation_sum: number | null;
  wind_speed_max: number | null;
  created_at: string;
};

const DEFAULT_DATABASE_PATH = "/Users/sanghyunlee/ai_agent_test/data/weather.sqlite";

let database: DatabaseSyncInstance | null = null;
let databasePath: string | null = null;

export function getDatabasePath() {
  return process.env.WEATHER_DB_PATH ?? DEFAULT_DATABASE_PATH;
}

export function getDatabase() {
  const nextPath = getDatabasePath();

  if (database && databasePath === nextPath && fs.existsSync(nextPath)) {
    return database;
  }

  if (database) {
    database.close();
  }

  fs.mkdirSync(path.dirname(nextPath), { recursive: true });
  database = new DatabaseSync(nextPath);
  databasePath = nextPath;
  database.exec(`
    CREATE TABLE IF NOT EXISTS weather_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query_mode TEXT NOT NULL CHECK (query_mode IN ('past', 'today', 'future')),
      location_source TEXT NOT NULL CHECK (location_source IN ('browser_location', 'map_click', 'city_search', 'history_click')),
      display_name TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      requested_date TEXT NOT NULL,
      api_source TEXT NOT NULL CHECK (api_source IN ('forecast', 'archive')),
      temperature_max REAL,
      temperature_min REAL,
      temperature_current REAL,
      weather_code INTEGER,
      precipitation_sum REAL,
      wind_speed_max REAL,
      raw_response TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_weather_queries_created_at
      ON weather_queries(created_at DESC, id DESC);
  `);

  return database;
}

export function insertWeatherQuery(result: WeatherResult) {
  const db = getDatabase();
  const statement = db.prepare(`
    INSERT INTO weather_queries (
      query_mode,
      location_source,
      display_name,
      latitude,
      longitude,
      requested_date,
      api_source,
      temperature_max,
      temperature_min,
      temperature_current,
      weather_code,
      precipitation_sum,
      wind_speed_max,
      raw_response
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  statement.run(
    result.mode,
    result.locationSource,
    result.displayName,
    result.latitude,
    result.longitude,
    result.requestedDate,
    result.apiSource,
    result.temperatureMax,
    result.temperatureMin,
    result.temperatureCurrent,
    result.weatherCode,
    result.precipitationSum,
    result.windSpeedMax,
    JSON.stringify(result.rawResponse),
  );
}

export function getRecentWeatherQueries(limit = 10): WeatherHistoryItem[] {
  const db = getDatabase();
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  const rows = db
    .prepare(
      `
      SELECT
        id,
        query_mode,
        location_source,
        display_name,
        latitude,
        longitude,
        requested_date,
        api_source,
        temperature_current,
        temperature_max,
        temperature_min,
        weather_code,
        precipitation_sum,
        wind_speed_max,
        created_at
      FROM weather_queries
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ?
    `,
    )
    .all(safeLimit) as HistoryRow[];

  return rows.map((row) => ({
    id: row.id,
    queryMode: row.query_mode,
    locationSource: row.location_source,
    displayName: row.display_name,
    latitude: row.latitude,
    longitude: row.longitude,
    requestedDate: row.requested_date,
    apiSource: row.api_source,
    temperatureCurrent: row.temperature_current,
    temperatureMax: row.temperature_max,
    temperatureMin: row.temperature_min,
    weatherCode: row.weather_code,
    precipitationSum: row.precipitation_sum,
    windSpeedMax: row.wind_speed_max,
    createdAt: row.created_at,
  }));
}

export function resetDatabaseConnectionForTests() {
  if (database) {
    database.close();
  }

  database = null;
  databasePath = null;
}
