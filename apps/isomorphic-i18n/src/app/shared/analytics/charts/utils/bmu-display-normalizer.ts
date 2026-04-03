/**
 * BMU Display Name Normalization
 *
 * Keeps labels aligned with the rest of the dashboard (hyphenated Title-Case):
 * - "Kiwayuu_cha_ndani" → "Kiwayuu-Cha-Ndani"
 * - "Kiwayuu cha Ndani" → "Kiwayuu-Cha-Ndani"
 */

export const normalizeBmuForDisplay = (bmuName: string): string => {
  if (!bmuName) return bmuName;

  return bmuName
    .trim()
    .replace(/[_\s]+/g, '-')
    .split('-')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('-');
};

/** Collapse separators for comparison (case-insensitive). */
export const normalizeBmuNameLoose = (name: string): string =>
  name.toLowerCase().replace(/[-_\s]/g, '').trim();

/**
 * Match a BMU from filters/session to `landing_site` from APIs.
 * Kiwayuu outer site: registry often uses "Nje" / "cha Nje" while Mongo may use "Inde" / "cha_inde" for the same landing.
 */
export function landingSiteMatchesQueryBmu(queryBmu: string, landingSite: string): boolean {
  const q = normalizeBmuNameLoose(queryBmu);
  const l = normalizeBmuNameLoose(landingSite);
  if (q === l) return true;

  if (!q.includes('kiwayuu') || !l.includes('kiwayuu')) return false;

  const siteKind = (n: string): 'ndani' | 'outer' | 'other' => {
    if (n.includes('ndani')) return 'ndani';
    if (n.includes('nje') || n.includes('inde')) return 'outer';
    return 'other';
  };

  const qk = siteKind(q);
  const lk = siteKind(l);
  if (qk === 'other' || lk === 'other') return false;
  return qk === lk;
}

/**
 * Normalize BMU names in chart data keys for display
 */
export const normalizeChartDataKeys = (data: Record<string, any>): Record<string, any> => {
  const normalized: Record<string, any> = {};

  Object.entries(data).forEach(([key, value]) => {
    if (key === 'date' || key === 'average' || key === 'historical_average' ||
        key === 'difference' || key === 'isAboveAverage' || key === 'actualValue' ||
        key === 'individualFisher') {
      normalized[key] = value;
    } else {
      normalized[normalizeBmuForDisplay(key)] = value;
    }
  });

  return normalized;
};

/**
 * Normalize site colors object keys for display
 */
export const normalizeSiteColors = (siteColors: Record<string, string>): Record<string, string> => {
  const normalized: Record<string, string> = {};

  Object.entries(siteColors).forEach(([key, value]) => {
    if (key === 'average' || key === 'historical_average' || key === 'individualFisher') {
      normalized[key] = value;
    } else {
      normalized[normalizeBmuForDisplay(key)] = value;
    }
  });

  return normalized;
};

/**
 * Normalize visibility state object keys for display
 */
export const normalizeVisibilityState = (visibilityState: Record<string, any>): Record<string, any> => {
  const normalized: Record<string, any> = {};

  Object.entries(visibilityState).forEach(([key, value]) => {
    if (key.endsWith('Positive') || key.endsWith('Negative')) {
      const suffix = key.endsWith('Positive') ? 'Positive' : 'Negative';
      const baseName = key.slice(0, -(suffix.length));
      if (baseName === 'average' || baseName === 'historical_average' || baseName === 'individualFisher') {
        normalized[key] = value;
      } else {
        normalized[normalizeBmuForDisplay(baseName) + suffix] = value;
      }
    }
    else if (key === 'average' || key === 'historical_average' || key === 'individualFisher') {
      normalized[key] = value;
    } else {
      normalized[normalizeBmuForDisplay(key)] = value;
    }
  });

  return normalized;
};

export const getBmuDisplayName = (bmuName: string): string => {
  if (bmuName === 'average') return 'Average';
  if (bmuName === 'historical_average') return 'Historical Average';
  if (bmuName === 'individualFisher') return 'Your Performance';

  return normalizeBmuForDisplay(bmuName);
};
