export type WeatherMode = "past" | "today" | "future";

export const MIN_ARCHIVE_DATE = "1940-01-01";
export const MAX_FORECAST_DAYS = 16;

export type DateValidation =
  | { ok: true; apiSource: "forecast" | "archive"; forecastDays?: number }
  | { ok: false; message: string; status: number };

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(dateString: string, days: number): string {
  const date = dateFromIsoDate(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDate(date);
}

export function todayString(): string {
  return formatLocalDate(new Date());
}

export function dateFromIsoDate(dateString: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

  if (!match) {
    throw new Error("날짜는 YYYY-MM-DD 형식이어야 합니다.");
  }

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (formatUtcDate(date) !== dateString) {
    throw new Error("존재하지 않는 날짜입니다.");
  }

  return date;
}

export function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysBetween(startDate: string, endDate: string): number {
  const start = dateFromIsoDate(startDate).getTime();
  const end = dateFromIsoDate(endDate).getTime();
  return Math.round((end - start) / 86_400_000);
}

export function getDateBounds(referenceDate = todayString()) {
  return {
    today: referenceDate,
    yesterday: addDays(referenceDate, -1),
    tomorrow: addDays(referenceDate, 1),
    minArchiveDate: MIN_ARCHIVE_DATE,
    maxFutureDate: addDays(referenceDate, MAX_FORECAST_DAYS - 1),
  };
}

export function validateWeatherDate(
  mode: WeatherMode,
  requestedDate: string,
  referenceDate = todayString(),
): DateValidation {
  try {
    dateFromIsoDate(requestedDate);
    dateFromIsoDate(referenceDate);
  } catch (error) {
    return {
      ok: false,
      status: 400,
      message: error instanceof Error ? error.message : "날짜 형식이 올바르지 않습니다.",
    };
  }

  const offset = daysBetween(referenceDate, requestedDate);

  if (mode === "today") {
    if (offset !== 0) {
      return {
        ok: false,
        status: 400,
        message: "오늘 날씨는 오늘 날짜로만 조회할 수 있습니다.",
      };
    }

    return { ok: true, apiSource: "forecast", forecastDays: 1 };
  }

  if (mode === "future") {
    if (offset <= 0) {
      return {
        ok: false,
        status: 400,
        message: "미래 날씨는 내일부터 선택해 주세요.",
      };
    }

    if (offset >= MAX_FORECAST_DAYS) {
      return {
        ok: false,
        status: 400,
        message: "Open-Meteo 예보는 오늘을 포함해 최대 16일 범위까지만 조회할 수 있습니다.",
      };
    }

    return { ok: true, apiSource: "forecast", forecastDays: offset + 1 };
  }

  if (requestedDate < MIN_ARCHIVE_DATE) {
    return {
      ok: false,
      status: 400,
      message: "Open-Meteo 과거 날씨는 1940-01-01 이후 날짜만 조회할 수 있습니다.",
    };
  }

  if (offset >= 0) {
    return {
      ok: false,
      status: 400,
      message: "과거 날씨는 어제 이전 날짜를 선택해 주세요.",
    };
  }

  return { ok: true, apiSource: "archive" };
}
