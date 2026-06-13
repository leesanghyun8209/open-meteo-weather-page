"use client";

import dynamic from "next/dynamic";
import {
  CalendarDays,
  Clock3,
  CloudSun,
  History,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  Wind,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { addDays, getDateBounds, todayString, type WeatherMode } from "@/lib/date-rules";
import { weatherCodeLabel } from "@/lib/weather-codes";
import type {
  LocationSearchResult,
  LocationSource,
  ReverseLocationResult,
  WeatherHistoryItem,
  WeatherResult,
} from "@/lib/weather-types";

const WeatherMap = dynamic(() => import("./WeatherMap"), {
  ssr: false,
  loading: () => <div className="map-loading">지도를 불러오는 중입니다.</div>,
});

type SelectedLocation = {
  latitude: number;
  longitude: number;
  displayName: string;
  source: LocationSource;
};

type ApiError = {
  error?: {
    message?: string;
  };
};

const SEOUL: SelectedLocation = {
  latitude: 37.5665,
  longitude: 126.978,
  displayName: "Seoul, South Korea",
  source: "map_click",
};

export function WeatherDashboard() {
  const bounds = useMemo(() => getDateBounds(todayString()), []);
  const [location, setLocation] = useState<SelectedLocation>(SEOUL);
  const [mode, setMode] = useState<WeatherMode>("today");
  const [date, setDate] = useState(bounds.today);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [history, setHistory] = useState<WeatherHistoryItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const locationRequestIdRef = useRef(0);

  const fetchHistory = useCallback(async () => {
    const response = await fetch("/api/weather/history", { cache: "no-store" });
    const data = (await response.json()) as { history?: WeatherHistoryItem[] };
    setHistory(data.history ?? []);
  }, []);

  const loadWeather = useCallback(
    async (nextLocation: SelectedLocation, nextMode: WeatherMode, nextDate: string) => {
      setIsLoadingWeather(true);
      setError(null);

      try {
        const response = await fetch("/api/weather", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: nextLocation.latitude,
            longitude: nextLocation.longitude,
            displayName: nextLocation.displayName,
            date: nextDate,
            mode: nextMode,
            locationSource: nextLocation.source,
          }),
        });
        const data = (await response.json()) as { weather?: WeatherResult } & ApiError;

        if (!response.ok) {
          throw new Error(data.error?.message ?? "날씨를 조회하지 못했습니다.");
        }

        setWeather(data.weather ?? null);
        await fetchHistory();
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "날씨를 조회하지 못했습니다.");
      } finally {
        setIsLoadingWeather(false);
      }
    },
    [fetchHistory],
  );

  const submitWeather = useCallback(
    async (override?: Partial<SelectedLocation> & { mode?: WeatherMode; date?: string; source?: LocationSource }) => {
      const nextLocation: SelectedLocation = {
        latitude: override?.latitude ?? location.latitude,
        longitude: override?.longitude ?? location.longitude,
        displayName: override?.displayName ?? location.displayName,
        source: override?.source ?? location.source,
      };
      const nextMode = override?.mode ?? mode;
      const nextDate = override?.date ?? date;

      await loadWeather(nextLocation, nextMode, nextDate);
    },
    [date, loadWeather, location, mode],
  );

  const resolveCoordinateLocation = useCallback(async (latitude: number, longitude: number) => {
    const response = await fetch(
      `/api/locations/reverse?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`,
      { cache: "no-store" },
    );
    const data = (await response.json()) as { location?: ReverseLocationResult } & ApiError;

    if (!response.ok || !data.location) {
      throw new Error(data.error?.message ?? "지역명을 확인하지 못했습니다.");
    }

    return data.location;
  }, []);

  const applyCoordinateSelection = useCallback(
    async ({
      latitude,
      longitude,
      source,
      autoFetch,
      pendingNotice,
      resolvedNotice,
    }: {
      latitude: number;
      longitude: number;
      source: LocationSource;
      autoFetch?: boolean;
      pendingNotice: string;
      resolvedNotice: string;
    }) => {
      const requestId = locationRequestIdRef.current + 1;
      locationRequestIdRef.current = requestId;

      const pendingLocation: SelectedLocation = {
        latitude,
        longitude,
        displayName: "지역명을 확인하는 중...",
        source,
      };

      setLocation(pendingLocation);
      setNotice(pendingNotice);
      setError(null);
      setIsResolvingLocation(true);

      try {
        const resolved = await resolveCoordinateLocation(latitude, longitude);

        if (locationRequestIdRef.current !== requestId) {
          return;
        }

        const nextLocation: SelectedLocation = {
          latitude,
          longitude,
          displayName: resolved.displayName,
          source,
        };

        setLocation(nextLocation);
        setNotice(resolved.fallbackUsed ? "정확한 행정구역명을 찾지 못해 좌표 기준 이름으로 표시합니다." : resolvedNotice);

        if (autoFetch) {
          await loadWeather(nextLocation, "today", bounds.today);
        }
      } catch (caughtError) {
        if (locationRequestIdRef.current !== requestId) {
          return;
        }

        const fallbackLocation: SelectedLocation = {
          latitude,
          longitude,
          displayName: coordinateDisplayName(latitude, longitude),
          source,
        };

        setLocation(fallbackLocation);
        setNotice(caughtError instanceof Error ? caughtError.message : "지역명을 확인하지 못해 좌표 기준으로 표시합니다.");

        if (autoFetch) {
          await loadWeather(fallbackLocation, "today", bounds.today);
        }
      } finally {
        if (locationRequestIdRef.current === requestId) {
          setIsResolvingLocation(false);
        }
      }
    },
    [bounds.today, loadWeather, resolveCoordinateLocation],
  );

  const locateUser = useCallback(
    (autoFetch = false) => {
      if (!navigator.geolocation) {
          setNotice("이 브라우저에서는 현재 위치를 사용할 수 없어 기본 지역으로 시작합니다.");
          if (autoFetch) {
          void loadWeather(SEOUL, "today", bounds.today);
        }
        return;
      }

      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLocating(false);
          void applyCoordinateSelection({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            source: "browser_location",
            autoFetch,
            pendingNotice: "현재 위치의 지역명을 확인하는 중입니다.",
            resolvedNotice: "현재 위치를 기본 지역으로 설정했습니다.",
          });
        },
        () => {
          setLocation(SEOUL);
          setNotice("현재 위치를 가져오지 못해 기본 지역으로 시작합니다.");
          setIsLocating(false);
          if (autoFetch) {
            void loadWeather(SEOUL, "today", bounds.today);
          }
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
      );
    },
    [applyCoordinateSelection, bounds.today, loadWeather],
  );

  useEffect(() => {
    void fetchHistory();
    locateUser(true);
  }, [fetchHistory, locateUser]);

  function handleModeChange(nextMode: WeatherMode) {
    setMode(nextMode);
    if (nextMode === "today") {
      setDate(bounds.today);
    } else if (nextMode === "future") {
      setDate(bounds.tomorrow);
    } else {
      setDate(bounds.yesterday);
    }
  }

  async function handleLocationSearch() {
    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(`/api/locations/search?query=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { locations?: LocationSearchResult[] } & ApiError;

      if (!response.ok) {
        throw new Error(data.error?.message ?? "지역을 검색하지 못했습니다.");
      }

      setSearchResults(data.locations ?? []);
      if ((data.locations ?? []).length === 0) {
        setNotice("검색 결과가 없습니다. 도시명이나 지역명을 조금 다르게 입력해 주세요.");
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "지역을 검색하지 못했습니다.");
    } finally {
      setIsSearching(false);
    }
  }

  function selectSearchResult(result: LocationSearchResult) {
    setLocation({
      latitude: result.latitude,
      longitude: result.longitude,
      displayName: result.displayName,
      source: "city_search",
    });
    setSearchResults([]);
    setQuery(result.displayName);
    setNotice(`${result.displayName} 지역을 선택했습니다.`);
  }

  function selectMapLocation(latitude: number, longitude: number) {
    void applyCoordinateSelection({
      latitude,
      longitude,
      source: "map_click",
      pendingNotice: "지도에서 선택한 위치의 지역명을 확인하는 중입니다.",
      resolvedNotice: "지도에서 선택한 지역으로 변경했습니다.",
    });
  }

  function selectHistory(item: WeatherHistoryItem) {
    const nextLocation: SelectedLocation = {
      latitude: item.latitude,
      longitude: item.longitude,
      displayName: item.displayName,
      source: "history_click",
    };

    setLocation(nextLocation);
    setMode(item.queryMode);
    setDate(item.requestedDate);
    void submitWeather({ ...nextLocation, mode: item.queryMode, date: item.requestedDate });
  }

  const helperText = getHelperText(mode, bounds);

  return (
    <main className="app-shell">
      <div className="workspace">
        <header className="masthead">
          <div>
            <h1>Open-Meteo Weather</h1>
            <p>지도와 검색으로 지역을 고르고 과거, 오늘, 예보 범위의 날씨를 조회합니다.</p>
          </div>
          <div className="status-line">
            <Clock3 size={16} aria-hidden="true" />
            기준일 {bounds.today}
          </div>
        </header>

        <section className="panel control-panel" aria-label="날씨 조회 조건">
          <div className="panel-header">
            <h2>지역과 날짜</h2>
            <p>기본 지역은 브라우저 현재 위치이며, 권한을 허용하지 않으면 서울에서 시작합니다.</p>
          </div>

          <div className="map-wrap">
            <WeatherMap latitude={location.latitude} longitude={location.longitude} onSelect={selectMapLocation} />
          </div>

          <div className="controls">
            <div className="search-box">
              <label htmlFor="location-search">지역 검색</label>
              <div className="input-row">
                <input
                  id="location-search"
                  value={query}
                  placeholder="예: Seoul, Tokyo, New York"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleLocationSearch();
                    }
                  }}
                />
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => void handleLocationSearch()}
                  disabled={isSearching}
                  title="지역 검색"
                  aria-label="지역 검색"
                >
                  {isSearching ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => locateUser(false)}
                  disabled={isLocating}
                >
                  <LocateFixed size={17} aria-hidden="true" />
                  현재 위치
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="search-results" aria-label="지역 검색 결과">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      className="search-result"
                      type="button"
                      onClick={() => selectSearchResult(result)}
                    >
                      <strong>{result.name}</strong>
                      <span>{[result.admin1, result.country].filter(Boolean).join(", ")}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="selected-location">
              <div>
                <strong>{location.displayName}</strong>
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </div>
              <MapPin size={20} aria-hidden="true" />
            </div>

            <div className="tabs" role="tablist" aria-label="조회 모드">
              {(["past", "today", "future"] as WeatherMode[]).map((item) => (
                <button
                  key={item}
                  className={`tab ${mode === item ? "active" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={mode === item}
                  onClick={() => handleModeChange(item)}
                >
                  {modeLabel(item)}
                </button>
              ))}
            </div>

            <div className="date-row">
              <input
                className="date-input"
                type="date"
                value={date}
                disabled={mode === "today"}
                min={mode === "past" ? bounds.minArchiveDate : mode === "future" ? bounds.tomorrow : bounds.today}
                max={mode === "past" ? bounds.yesterday : mode === "future" ? bounds.maxFutureDate : bounds.today}
                onChange={(event) => setDate(event.target.value)}
              />
              <button
                className="primary-button"
                type="button"
                onClick={() => void submitWeather()}
                disabled={isLoadingWeather || isResolvingLocation}
              >
                {isLoadingWeather ? <Loader2 size={17} className="spin" /> : <CloudSun size={17} />}
                날씨 조회
              </button>
            </div>
            <div className="helper">{helperText}</div>

            {notice && <div className="message info">{notice}</div>}
            {error && <div className="message error">{error}</div>}
          </div>
        </section>

        <section className="result-panel" aria-label="날씨 결과와 최근 조회">
          <div className="panel weather-result">
            <h2>날씨 정보</h2>
            {weather ? <WeatherResultView weather={weather} /> : <div className="empty">지역과 날짜를 선택하면 날씨 정보가 표시됩니다.</div>}
          </div>

          <div className="panel history-panel">
            <h2>
              <History size={18} aria-hidden="true" /> 최근 조회
            </h2>
            {history.length > 0 ? (
              <div className="history-list">
                {history.map((item) => (
                  <button key={item.id} className="history-item" type="button" onClick={() => selectHistory(item)}>
                    <span className="history-top">
                      <strong>{item.displayName}</strong>
                      <span>{modeLabel(item.queryMode)}</span>
                    </span>
                    <span>
                      {item.requestedDate} · {formatTemperature(item.temperatureCurrent ?? item.temperatureMax)} ·{" "}
                      {weatherCodeLabel(item.weatherCode)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty">아직 저장된 조회 기록이 없습니다.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function WeatherResultView({ weather }: { weather: WeatherResult }) {
  const headlineTemperature = weather.temperatureCurrent ?? weather.temperatureMax;

  return (
    <div className="result-card">
      <div className="result-main">
        <div>
          <h3>{weather.displayName}</h3>
          <p>
            {modeLabel(weather.mode)} · {weather.requestedDate} · {weather.apiSource}
          </p>
          <p>{weatherCodeLabel(weather.weatherCode)}</p>
        </div>
        <div className="temperature">{formatTemperature(headlineTemperature)}</div>
      </div>

      <div className="metric-grid">
        <Metric label="최고 / 최저" value={`${formatTemperature(weather.temperatureMax)} / ${formatTemperature(weather.temperatureMin)}`} />
        <Metric label="강수량" value={formatMillimeters(weather.precipitationSum)} />
        <Metric label="풍속" value={formatSpeed(weather.windSpeedMax)} icon={<Wind size={16} aria-hidden="true" />} />
        <Metric
          label="체감 / 습도"
          value={
            weather.mode === "today"
              ? `${formatTemperature(weather.apparentTemperature)} / ${formatPercent(weather.relativeHumidity)}`
              : "과거/미래 일별 요약에는 없음"
          }
          icon={<CalendarDays size={16} aria-hidden="true" />}
        />
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="metric">
      <span>
        {icon} {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function modeLabel(mode: WeatherMode) {
  if (mode === "past") {
    return "과거";
  }

  if (mode === "future") {
    return "미래";
  }

  return "오늘";
}

function getHelperText(mode: WeatherMode, bounds: ReturnType<typeof getDateBounds>) {
  if (mode === "past") {
    return `과거 날씨는 ${bounds.minArchiveDate}부터 ${bounds.yesterday}까지 조회할 수 있습니다. 최근 데이터는 제공 지연으로 비어 있을 수 있습니다.`;
  }

  if (mode === "future") {
    return `미래 예보는 Open-Meteo Forecast API 제약에 따라 오늘 포함 16일 범위인 ${bounds.tomorrow}부터 ${bounds.maxFutureDate}까지 선택할 수 있습니다.`;
  }

  return "오늘 날씨는 현재값과 일별 요약을 함께 표시합니다.";
}

function formatTemperature(value: number | null | undefined) {
  return typeof value === "number" ? `${Math.round(value)}°C` : "-";
}

function formatSpeed(value: number | null | undefined) {
  return typeof value === "number" ? `${Math.round(value)} km/h` : "-";
}

function formatMillimeters(value: number | null | undefined) {
  return typeof value === "number" ? `${value.toFixed(1)} mm` : "-";
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" ? `${Math.round(value)}%` : "-";
}

function coordinateDisplayName(latitude: number, longitude: number) {
  return `좌표 위치 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
}
