/**
 * Gear Type Translation Utilities
 *
 * This file provides consistent gear type translations across all gear-related components.
 * Following the same pattern as fish species translations for consistency.
 */

// Mapping from gear type values to translation keys
export const GEAR_TRANSLATION_KEYS: Record<string, string> = {
  // Primary gear types - Lines
  "handline": "text-gear-handline",
  "Handline": "text-gear-handline",
  "longline": "text-gear-longline",
  "Longline": "text-gear-longline",
  "long line": "text-gear-longline",
  "Long Line": "text-gear-longline",
  "trolling line": "text-gear-trolling-line",
  "Trolling Line": "text-gear-trolling-line",
  "trolling_line": "text-gear-trolling-line",
  "trollingline": "text-gear-trolling-line",
  "Trollingline": "text-gear-trolling-line",
  "TrollingLine": "text-gear-trolling-line",

  // Speargun
  "speargun": "text-gear-speargun",
  "Speargun": "text-gear-speargun",
  "speagun": "text-gear-speargun", // Typo variant

  // Hook and stick
  "hook and stick": "text-gear-hook-and-stick",
  "Hook And Stick": "text-gear-hook-and-stick",
  "hook_and_stick": "text-gear-hook-and-stick",

  // Traps
  "trap": "text-gear-trap",
  "Trap": "text-gear-trap",
  "traps": "text-gear-trap",
  "Traps": "text-gear-trap",
  "fence trap": "text-gear-fence-trap",
  "Fence Trap": "text-gear-fence-trap",
  "fence_trap": "text-gear-fence-trap",
  "fencetrap": "text-gear-fence-trap",
  "Fencetrap": "text-gear-fence-trap",
  "FenceTrap": "text-gear-fence-trap",
  "basket trap": "text-gear-basket-trap",
  "Basket Trap": "text-gear-basket-trap",

  // Net types - General
  "nets": "text-gear-nets",
  "Nets": "text-gear-nets",
  "net": "text-gear-nets",
  "Net": "text-gear-nets",

  // Gillnet variations
  "gillnet": "text-gear-gillnet",
  "Gillnet": "text-gear-gillnet",
  "Gill Net": "text-gear-gillnet",
  "gill net": "text-gear-gillnet",
  "monofilament": "text-gear-monofilament",
  "Monofilament": "text-gear-monofilament",
  "mono filament": "text-gear-monofilament",
  "Mono Filament": "text-gear-monofilament",
  "monofilament gillnet": "text-gear-monofilament-gillnet",
  "Monofilament Gillnet": "text-gear-monofilament-gillnet",
  "monofilament_gillnet": "text-gear-monofilament-gillnet",
  "Monofilament Gill Net": "text-gear-monofilament-gillnet",
  "mono gillnet": "text-gear-monofilament-gillnet",
  "Mono Gillnet": "text-gear-monofilament-gillnet",

  // Seine nets
  "seine net": "text-gear-seine-net",
  "Seine Net": "text-gear-seine-net",
  "beach seine": "text-gear-beach-seine",
  "Beach Seine": "text-gear-beach-seine",
  "beachseine": "text-gear-beach-seine",
  "Beachseine": "text-gear-beach-seine",
  "reef seine": "text-gear-reef-seine",
  "Reef Seine": "text-gear-reef-seine",
  "reefseine": "text-gear-reef-seine",

  // Ring net
  "ring net": "text-gear-ring-net",
  "Ring Net": "text-gear-ring-net",
  "ringnet": "text-gear-ring-net",
  "Ringnet": "text-gear-ring-net",

  // Scoop net and Cast net
  "scoop net": "text-gear-scoop-net",
  "Scoop Net": "text-gear-scoop-net",
  "scoopnet": "text-gear-scoop-net",
  "cast net": "text-gear-cast-net",
  "Cast Net": "text-gear-cast-net",
  "castnet": "text-gear-cast-net",
  "scoop & cast": "text-gear-scoop-cast",
  "Scoop & Cast": "text-gear-scoop-cast",
  "scoop&cast": "text-gear-scoop-cast",
  "scoopnet & castnet": "text-gear-scoop-cast",

  // Trammel net
  "trammel net": "text-gear-trammel-net",
  "Trammel Net": "text-gear-trammel-net",
  "trammel_net": "text-gear-trammel-net",

  // Mosquito net
  "mosquito net": "text-gear-mosquito-net",
  "Mosquito Net": "text-gear-mosquito-net",
  "mosquito_net": "text-gear-mosquito-net",

  // Other/Jarife
  "other": "text-gear-other",
  "Other": "text-gear-other",
  "jarife": "text-gear-jarife",
  "Jarife": "text-gear-jarife",
};

export interface GearTypeOption {
  label: string;
  value: string;
  color?: string;
}

/**
 * Static gear types with English values (value field stays in English for API compatibility)
 */
export const GEAR_TYPES_BASE = [
  "handline",
  "speargun",
  "gillnet",
  "hook and stick",
  "trap",
  "basket trap",
  "seine net",
  "ring net",
  "scoop net",
  "beach seine",
  "other",
];

/**
 * Function to get translated gear type label
 * @param gearValue - The gear type value (in English, as stored in the database)
 * @param t - Translation function
 * @returns Translated gear type label
 */
export const getGearTypeLabel = (gearValue: string, t: (key: string) => string): string => {
  if (!gearValue || gearValue === "NA") return t("text-unknown");

  // Normalize the gear value for lookup
  const normalizedValue = gearValue.trim();
  const translationKey = GEAR_TRANSLATION_KEYS[normalizedValue];

  if (translationKey) {
    return t(translationKey);
  }

  // Fallback to capitalized version if no translation found
  return capitalizeGearType(gearValue);
};

/**
 * Capitalize gear type for display (fallback when no translation available)
 */
export const capitalizeGearType = (gear: string): string => {
  if (!gear || gear === "NA") return "Unknown";
  return gear
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

/**
 * Function to get all translated gear types
 * @param t - Translation function
 * @returns Array of gear type options with translated labels
 */
export const getGearTypes = (t: (key: string) => string): GearTypeOption[] => {
  return GEAR_TYPES_BASE.map(gearValue => ({
    label: getGearTypeLabel(gearValue, t),
    value: gearValue,
  }));
};

/**
 * Default gear types (for backwards compatibility - uses English labels)
 */
export const GEAR_TYPES: GearTypeOption[] = GEAR_TYPES_BASE.map(gearValue => ({
  label: capitalizeGearType(gearValue),
  value: gearValue,
}));
