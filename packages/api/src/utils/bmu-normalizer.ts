/**
 * BMU Name Normalization Utilities
 *
 * Handles inconsistencies across sources:
 * - UI/session: "Shelly-Timbwani", "Kiwayuu cha Ndani" (hyphens or spaces)
 * - MongoDB: "Shelly_timbwani", "Kiwayuu_cha_ndani" (underscores)
 *
 * Contract with the app: routers use `getAllBmuVariants` / `normalizeBmusForQuery` so Mongo
 * `landing_site` matches expanded OR conditions; the client maps responses back onto the
 * user’s canonical filter keys via `landingSiteMatchesQueryBmu` (see isomorphic-i18n
 * `bmu-display-normalizer.ts`).
 */

const capitalizeWord = (word: string) =>
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

/**
 * Normalize BMU name for strict DB-style key (underscores, lowercase)
 */
export const normalizeBmuForQuery = (bmuName: string): string => {
  return bmuName.trim().replace(/[-_\s]+/g, '_').toLowerCase();
};

/**
 * Normalize BMU name from database format to hyphenated display
 */
export const normalizeBmuForDisplay = (bmuName: string): string => {
  const parts = bmuName
    .trim()
    .replace(/[_\s]+/g, '-')
    .split('-')
    .filter(Boolean);

  return parts.map(capitalizeWord).join('-');
};

/**
 * Generate all possible BMU name variants for querying
 */
export const generateBmuVariants = (bmuName: string): string[] => {
  const variants = new Set<string>();
  const trimmedName = bmuName.trim();
  if (!trimmedName) return [];

  variants.add(trimmedName);
  variants.add(trimmedName.toLowerCase());

  const parts = trimmedName.split(/[-_\s]+/).filter(Boolean);
  const separators = ['_', '-', ' '];

  separators.forEach(separator => {
    const joined = parts.join(separator);
    const lowerJoined = parts.map(p => p.toLowerCase()).join(separator);
    const titleJoined = parts.map(capitalizeWord).join(separator);
    const firstCapitalRestLower =
      parts.length > 0
        ? [capitalizeWord(parts[0]), ...parts.slice(1).map(p => p.toLowerCase())].join(separator)
        : '';

    variants.add(joined);
    variants.add(lowerJoined);
    variants.add(titleJoined);
    if (firstCapitalRestLower) variants.add(firstCapitalRestLower);
  });

  return Array.from(variants);
};

export const normalizeBmusForQuery = (bmuNames: string[]): string[] => {
  const allVariants: string[] = [];
  bmuNames.forEach(bmu => {
    allVariants.push(...generateBmuVariants(bmu));
  });
  return allVariants;
};

export const normalizeBmusForDisplay = (bmuNames: string[]): string[] => {
  return bmuNames.map(normalizeBmuForDisplay);
};

/**
 * When any Kiwayuu BMU is requested, also include Inde / Nje / Ndani variants
 * so catch and composition queries match Mongo even if the BMU registry uses another spelling.
 */
export const getAllBmuVariants = (bmus: string[]): string[] => {
  const normalizedBmus = normalizeBmusForQuery(bmus);

  const additionalBmus: string[] = [];
  bmus.forEach(bmu => {
    const normalized = bmu.toLowerCase().replace(/[-_\s]/g, '');
    if (normalized.includes('kiwayuu')) {
      if (!normalized.includes('inde')) {
        additionalBmus.push(
          'Kiwayuu cha Inde',
          'Kiwayuu_cha_inde',
          'Kiwayuu_cha_Inde',
          'kiwayuu_cha_inde',
        );
      }
      if (!normalized.includes('nje')) {
        additionalBmus.push(
          'Kiwayuu cha Nje',
          'Kiwayuu_cha_nje',
          'Kiwayuu_cha_Nje',
          'kiwayuu_cha_nje',
        );
      }
      if (!normalized.includes('ndani')) {
        additionalBmus.push(
          'Kiwayuu cha Ndani',
          'Kiwayuu_cha_ndani',
          'Kiwayuu_cha_Ndani',
          'kiwayuu_cha_ndani',
        );
      }
    }
  });

  return Array.from(new Set([...bmus, ...normalizedBmus, ...additionalBmus]));
};

export const bmuNamesMatch = (bmuName1: string, bmuName2: string): boolean => {
  const normalize = (name: string) =>
    name.toLowerCase().replace(/[-_\s]/g, '').trim();

  return normalize(bmuName1) === normalize(bmuName2);
};

export const findBmuInArray = (searchName: string, bmuArray: string[]): string | null => {
  return bmuArray.find(bmu => bmuNamesMatch(searchName, bmu)) || null;
};
