type AddressParts = Record<string, string | undefined>;

export function buildAdministrativeDisplayName(
  address: AddressParts | undefined,
  fallbackDisplayName?: string,
): string | null {
  if (!address) {
    return compactFallbackDisplayName(fallbackDisplayName);
  }

  const parts = [
    address.country,
    address.province,
    address.state,
    address.region,
    address.state_district,
    address.county,
    address.city,
    address.municipality,
    address.town,
    address.village,
    address.borough,
    address.city_district,
    address.district,
    address.suburb,
    address.quarter,
    address.neighbourhood,
  ];
  const normalized = dedupe(parts);

  if (normalized.length > 0) {
    return normalized.join(" > ");
  }

  return compactFallbackDisplayName(fallbackDisplayName);
}

export function coordinateDisplayName(latitude: number, longitude: number) {
  return `좌표 위치 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
}

function compactFallbackDisplayName(displayName: string | undefined) {
  if (!displayName) {
    return null;
  }

  const parts = dedupe(displayName.split(",").map((part) => part.trim()).reverse());
  return parts.length > 0 ? parts.slice(0, 5).join(" > ") : null;
}

function dedupe(values: Array<string | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value?.trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}
