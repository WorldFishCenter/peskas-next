/**
 * BMU Name Normalization
 *
 * BMU (Beach Management Unit) names are recorded inconsistently across
 * collections - some documents use "Shelly-Timbwani" (hyphens/spaces,
 * mixed case), others "shelly_timbwani" (underscores, lowercase). A
 * handful of sites also go by genuinely different names depending on
 * the source - see BMU_SPELLING_ALIASES below.
 *
 * This module's only job is producing every spelling variant that might
 * be stored in Mongo for a given user-facing BMU name, so router queries
 * can `$in`-match against all of them: `getAllBmuVariants` is the one
 * function every router should call to build that match.
 *
 * Display-side formatting is a separate concern, owned by the frontend's
 * own `bmu-display-normalizer.ts` (apps/isomorphic-i18n).
 */

/**
 * Sites recorded under names that don't share a common separator/case
 * pattern, so the variants generated below can't bridge them on their
 * own. `trigger` is a lowercase, separator-free substring shared by every
 * spelling of the site; any input name containing it pulls in the whole
 * group. Add an entry here whenever another site turns out to have a
 * second registry spelling.
 */
const BMU_SPELLING_ALIASES: { trigger: string; names: string[] }[] = [
  {
    trigger: 'kiwayuu',
    names: ['Kiwayuu cha Inde', 'Kiwayuu cha Nje', 'Kiwayuu cha Ndani'],
  },
];

/** Loose canonical key used only to decide whether two spellings refer to the same site. */
const canonicalKey = (name: string): string =>
  name.trim().toLowerCase().replace(/[-_\s]+/g, '');

const capitalizeWord = (word: string) =>
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

/** All separator/case permutations of a single BMU name. */
const generateBmuVariants = (bmuName: string): string[] => {
  const variants = new Set<string>();
  const trimmedName = bmuName.trim();
  if (!trimmedName) return [];

  variants.add(trimmedName);
  variants.add(trimmedName.toLowerCase());

  const parts = trimmedName.split(/[-_\s]+/).filter(Boolean);

  ['_', '-', ' '].forEach((separator) => {
    variants.add(parts.join(separator));
    variants.add(parts.map((p) => p.toLowerCase()).join(separator));
    variants.add(parts.map(capitalizeWord).join(separator));
    if (parts.length > 0) {
      variants.add(
        [capitalizeWord(parts[0]), ...parts.slice(1).map((p) => p.toLowerCase())].join(separator)
      );
    }
  });

  return Array.from(variants);
};

/** Every alias-group name for BMUs matched by an entry in `bmus`, expanded to their own separator/case variants. */
const expandSpellingAliases = (bmus: string[]): string[] => {
  const keys = bmus.map(canonicalKey);

  return BMU_SPELLING_ALIASES.filter(({ trigger }) => keys.some((key) => key.includes(trigger)))
    .flatMap(({ names }) => names)
    .flatMap(generateBmuVariants);
};

/**
 * Every spelling a BMU name might appear under in Mongo: separator/case
 * variants of each input name, plus any known cross-spelling aliases.
 */
export const getAllBmuVariants = (bmus: string[]): string[] => {
  const variants = bmus.flatMap(generateBmuVariants);
  const aliases = expandSpellingAliases(bmus);

  return Array.from(new Set([...bmus, ...variants, ...aliases]));
};

/** Loose equality between two BMU names, ignoring separators and case. */
export const bmuNamesMatch = (bmuName1: string, bmuName2: string): boolean =>
  canonicalKey(bmuName1) === canonicalKey(bmuName2);
