const WEATHER_CODE_LABELS: Record<number, string> = {
  0: "맑음",
  1: "대체로 맑음",
  2: "부분적으로 흐림",
  3: "흐림",
  45: "안개",
  48: "서리 안개",
  51: "약한 이슬비",
  53: "이슬비",
  55: "강한 이슬비",
  56: "약한 어는 이슬비",
  57: "강한 어는 이슬비",
  61: "약한 비",
  63: "비",
  65: "강한 비",
  66: "약한 어는 비",
  67: "강한 어는 비",
  71: "약한 눈",
  73: "눈",
  75: "강한 눈",
  77: "싸락눈",
  80: "약한 소나기",
  81: "소나기",
  82: "강한 소나기",
  85: "약한 눈 소나기",
  86: "강한 눈 소나기",
  95: "뇌우",
  96: "우박을 동반한 뇌우",
  99: "강한 우박을 동반한 뇌우",
};

export function weatherCodeLabel(code: number | null | undefined): string {
  if (code === null || code === undefined) {
    return "데이터 없음";
  }

  return WEATHER_CODE_LABELS[code] ?? `날씨 코드 ${code}`;
}
