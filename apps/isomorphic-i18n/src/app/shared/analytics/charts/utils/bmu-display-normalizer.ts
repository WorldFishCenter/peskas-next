/**
 * BMU Name Normalization (frontend)
 *
 * Handles the same spelling inconsistencies as the backend's
 * `bmu-normalizer.ts` (packages/api), but for two different jobs:
 * - `normalizeBmuForDisplay`: format a raw name for display (hyphenated Title-Case).
 * - `landingSiteMatchesQueryBmu` / `lookupByBmuName`: match a raw name (from an
 *   API response, e.g. `landing_site`) back to a user's canonical filter/session
 *   value, or into a hardcoded lookup table, regardless of separator/case.
 *
 * Keeps labels aligned with the rest of the dashboard:
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
 * Look up a value keyed by BMU name, matching regardless of separator/case
 * style (e.g. a table keyed by "Shelly-Timbwani" still matches "shelly_timbwani").
 */
export function lookupByBmuName<T>(table: Record<string, T>, bmuName: string): T | null {
  if (bmuName in table) return table[bmuName];

  const key = normalizeBmuNameLoose(bmuName);
  const match = Object.keys(table).find(k => normalizeBmuNameLoose(k) === key);
  return match !== undefined ? table[match] : null;
}
