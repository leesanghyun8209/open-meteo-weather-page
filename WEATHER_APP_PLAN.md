# Open-Meteo 날씨 웹페이지 구현 계획 v2

## Summary

- `Next.js` 풀스택 앱으로 구현한다.
- 지역 선택은 `지도 클릭 + 도시 검색` GUI로 제공하고, 기본값은 브라우저 사용자 위치로 잡는다.
- 날짜 선택은 `과거 / 오늘 / 미래` 탭과 날짜 선택기를 함께 제공한다.
- Open-Meteo 제약을 반영해 미래는 최대 16일 예보, 과거는 Historical Weather API의 제공 범위 안에서만 조회한다.
- SQLite 조회 기록, 최근 조회 10건, `TEST_CHECKLIST.md`를 포함한다.

## Key Changes

### 지역 선택 GUI

- 앱 진입 시 브라우저 Geolocation 권한을 요청하고, 허용되면 사용자 위치에 지도 핀을 둔다.
- 권한 거부/실패 시 기본 위치는 서울로 두고 "현재 위치를 가져오지 못해 기본 지역으로 시작합니다" 안내를 표시한다.
- 지도는 Leaflet + OpenStreetMap 타일을 사용한다.
- 사용자는 지도 클릭으로 좌표를 선택하거나, Open-Meteo Geocoding API 검색 결과에서 지역을 선택한다.
- 검색 결과는 도시명, 국가, 행정구역을 표시하고 사용자가 직접 선택하게 한다.

### 날짜/날씨 조회

- `오늘`: Forecast API의 current/daily 데이터를 사용한다.
- `미래`: Forecast API를 사용하며 Open-Meteo 문서 기준 `forecast_days` 최대 16일까지만 허용한다. 16일 이후 날짜는 선택 불가 처리하고 안내 문구를 표시한다.
- `과거`: Historical Weather API `/v1/archive`를 사용한다. 문서 기준 1940년 이후 데이터 조회가 가능하므로 1940년 이전 날짜는 선택 불가 처리한다.
- 과거 최근 며칠 데이터가 비어 있거나 지연될 수 있으므로, 응답에 해당 날짜 데이터가 없으면 "선택한 날짜의 관측/재분석 데이터가 아직 제공되지 않습니다. 다른 날짜를 선택해 주세요."라고 안내한다.
- Open-Meteo 공식 근거:
  - Forecast API: 최대 16일 예보, `past_days` 최대 92일 ([docs](https://open-meteo.com/en/docs))
  - Historical Weather API: 1940년 이후 과거 데이터, 일부 모델은 지연 가능 ([docs](https://open-meteo.com/en/docs/historical-weather-api))
  - Geocoding API: 도시/우편번호 검색 결과 제공 ([docs](https://open-meteo.com/en/docs/geocoding-api))

### API Routes

- `GET /api/locations/search?query=...`
  - Open-Meteo Geocoding API 결과 반환
- `POST /api/weather`
  - 입력: `{ latitude, longitude, displayName, date, mode }`
  - `mode`: `today`, `future`, `past`
  - 서버에서 날짜 범위를 검증한 뒤 적절한 Open-Meteo API를 호출한다.
  - 성공한 조회만 SQLite에 저장한다.
- `GET /api/weather/history`
  - 최근 조회 10건을 최신순으로 반환한다.

### SQLite 저장

- DB 파일: `data/weather.sqlite`
- 테이블: `weather_queries`
- 주요 컬럼:
  - `id`
  - `query_mode`: `today`, `future`, `past`
  - `location_source`: `browser_location`, `map_click`, `city_search`, `history_click`
  - `display_name`
  - `latitude`
  - `longitude`
  - `requested_date`
  - `api_source`: `forecast` 또는 `archive`
  - `temperature_max`
  - `temperature_min`
  - `temperature_current`
  - `weather_code`
  - `precipitation_sum`
  - `wind_speed_max`
  - `raw_response`
  - `created_at`

### 화면 구성

- 상단: 지도, 현재 선택된 핀, 도시 검색창
- 중단: `과거 / 오늘 / 미래` 탭과 날짜 선택기
- 하단: 날씨 결과, 최근 조회 10건
- 최근 조회 항목 클릭 시 동일 좌표와 날짜 조건으로 재조회한다.
- 데이터 없음, API 오류, 위치 권한 거부, 날짜 범위 초과를 각각 다른 안내 메시지로 처리한다.

## Test Plan

### 자동 검증

- `npm run build`
- 날짜 검증 테스트: 1940년 이전, 오늘, 16일 이내 미래, 16일 초과 미래
- API 선택 테스트: 과거는 archive, 오늘/미래는 forecast 사용
- SQLite 저장 테스트: 성공 조회만 저장, 최근 기록은 최신순 10건
- Open-Meteo 응답에 데이터 배열이 비어 있을 때 친절한 오류 반환

### 수동 검증

- 위치 권한 허용 시 지도 기본 핀이 사용자 위치로 설정되는지 확인
- 위치 권한 거부 시 기본 지역과 안내 문구 확인
- 지도 클릭으로 지역 변경 후 조회
- 도시 검색 결과 선택 후 조회
- 과거 날짜 조회, 미래 16일 이내 조회, 미래 16일 초과 선택 제한 확인
- 최근 조회 기록 클릭 재조회 확인
- 모바일/데스크톱에서 지도, 탭, 날짜 선택기, 결과 영역이 겹치지 않는지 확인

## Assumptions

- Open-Meteo는 API 키 없이 비상업 용도 기준으로 사용한다.
- 미래 조회는 "선택 날짜 하루의 일별 요약"을 보여준다.
- 과거 조회도 일별 요약 중심으로 맞춰 오늘/미래 결과와 같은 UI 구조를 유지한다.
- 현재 위치의 사람이 읽는 주소는 역지오코딩 없이 `Current location`으로 표시한다.
- 구현 시점의 현재 날짜를 기준으로 날짜 선택 가능 범위를 동적으로 계산한다.
