import assert from "node:assert/strict";
import test from "node:test";
import { addDays, getDateBounds, validateWeatherDate } from "../lib/date-rules.ts";

test("date bounds include archive and forecast limits", () => {
  const bounds = getDateBounds("2026-06-13");

  assert.equal(bounds.minArchiveDate, "1940-01-01");
  assert.equal(bounds.today, "2026-06-13");
  assert.equal(bounds.yesterday, "2026-06-12");
  assert.equal(bounds.tomorrow, "2026-06-14");
  assert.equal(bounds.maxFutureDate, "2026-06-28");
});

test("future weather allows dates inside Open-Meteo 16-day forecast window", () => {
  const result = validateWeatherDate("future", "2026-06-28", "2026-06-13");

  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.apiSource : null, "forecast");
  assert.equal(result.ok ? result.forecastDays : null, 16);
});

test("future weather rejects dates outside forecast window", () => {
  const result = validateWeatherDate("future", "2026-06-29", "2026-06-13");

  assert.equal(result.ok, false);
  assert.match(result.ok ? "" : result.message, /16일/);
});

test("past weather rejects dates before archive availability", () => {
  const result = validateWeatherDate("past", "1939-12-31", "2026-06-13");

  assert.equal(result.ok, false);
  assert.match(result.ok ? "" : result.message, /1940-01-01/);
});

test("today weather requires today's date", () => {
  const result = validateWeatherDate("today", addDays("2026-06-13", 1), "2026-06-13");

  assert.equal(result.ok, false);
  assert.match(result.ok ? "" : result.message, /오늘 날짜/);
});
