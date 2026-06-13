import assert from "node:assert/strict";
import test from "node:test";
import { buildAdministrativeDisplayName, coordinateDisplayName } from "../lib/location-display.ts";

test("buildAdministrativeDisplayName formats administrative levels with dedupe", () => {
  const displayName = buildAdministrativeDisplayName({
    country: "대한민국",
    state: "서울특별시",
    city: "서울특별시",
    borough: "중구",
    suburb: "명동",
  });

  assert.equal(displayName, "대한민국 > 서울특별시 > 중구 > 명동");
});

test("buildAdministrativeDisplayName falls back to compact display name", () => {
  const displayName = buildAdministrativeDisplayName(undefined, "명동, 중구, 서울특별시, 대한민국");

  assert.equal(displayName, "대한민국 > 서울특별시 > 중구 > 명동");
});

test("coordinateDisplayName formats coordinate fallback", () => {
  assert.equal(coordinateDisplayName(37.5665, 126.978), "좌표 위치 (37.5665, 126.9780)");
});
