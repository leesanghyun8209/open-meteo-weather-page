# Open-Meteo Weather Page

Open-Meteo API를 사용해 지도와 검색 기반으로 지역을 선택하고, 과거/오늘/미래 날씨를 조회하는 Next.js 풀스택 웹앱입니다.

## Features

- 브라우저 현재 위치 기반 기본 지역 설정
- Leaflet 지도 클릭 및 Open-Meteo Geocoding API 검색
- 과거, 오늘, 미래 날씨 조회
- Open-Meteo API 날짜 제약 검증
- SQLite 기반 최근 조회 기록 10건 저장
- 데이터 없음, 위치 권한 거부, 날짜 범위 초과, API 오류 안내

## Getting Started

```bash
npm install
npm run dev
```

기본 개발 서버는 `http://localhost:3000`입니다. 포트가 사용 중이면 다음처럼 지정할 수 있습니다.

```bash
npm run dev -- --port 3010
```

## Checks

```bash
npm run test
npm run typecheck
npm run build
npm audit --omit=dev
```

## Notes

- 런타임 SQLite DB는 `data/weather.sqlite`에 자동 생성됩니다.
- `data/*.sqlite`는 Git에 커밋하지 않습니다.
- Node 22의 내장 `node:sqlite`를 사용하므로 실행 환경은 Node 22 이상을 권장합니다.
