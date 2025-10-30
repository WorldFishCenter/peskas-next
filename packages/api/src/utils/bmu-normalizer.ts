/**
 * BMU Name Normalization Utilities
 * 
 * Handles inconsistencies in BMU naming across different data sources:
 * - CSV/UI uses: "Shelly-Timbwani" (hyphens)
 * - Database uses: "Shelly_timbwani" (underscores)
 */

/**
 * Normalize BMU name from display format to database format
 * Handles:
 * - Hyphen to underscore conversion ("Shelly-Timbwani" -> "Shelly_timbwani")
 * - Case variations (preserves original case but generates lowercase variant too)
 * 
 * @param bmuName - BMU name in display format (e.g., "Shelly-Timbwani")
 * @returns BMU name in database format (e.g., "Shelly_timbwani")
 */
export const normalizeBmuForQuery = (bmuName: string): string => {
  // Convert hyphens to underscores and lowercase for database format
  // MongoDB has: "Shelly_timbwani" (underscore + lowercase)
  return bmuName.replace(/-/g, '_').toLowerCase();
};

/**
 * Normalize BMU name from database format to display format
 * @param bmuName - BMU name in database format (e.g., "Shelly_timbwani")
 * @returns BMU name in display format (e.g., "Shelly-Timbwani")
 */
export const normalizeBmuForDisplay = (bmuName: string): string => {
  // Convert underscores to hyphens
  // Optionally capitalize first letter after separator for display
  return bmuName
    .replace(/_/g, '-')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('-');
};

/**
 * Generate all possible BMU name variants for querying
 * This handles various naming inconsistencies in the database:
 * - "Shelly-Timbwani" (original from UI)
 * - "Shelly_Timbwani" (hyphen->underscore, case preserved)
 * - "Shelly_timbwani" (first word capital, rest lowercase with underscore) ← MongoDB format!
 * - "shelly_timbwani" (all lowercase with underscore)
 * 
 * @param bmuName - BMU name in any format
 * @returns Array of all possible variants
 */
export const generateBmuVariants = (bmuName: string): string[] => {
  const variants = new Set<string>();
  
  // Original
  variants.add(bmuName);
  
  // Hyphen to underscore, preserve case: "Shelly-Timbwani" -> "Shelly_Timbwani"
  variants.add(bmuName.replace(/-/g, '_'));
  
  // All lowercase with underscore: "Shelly-Timbwani" -> "shelly_timbwani"
  variants.add(bmuName.replace(/-/g, '_').toLowerCase());
  
  // All lowercase with hyphen: "Shelly-Timbwani" -> "shelly-timbwani"
  variants.add(bmuName.toLowerCase());
  
  // First word capital, rest lowercase with underscore (common DB format)
  // "Shelly-Timbwani" -> "Shelly_timbwani"
  const withUnderscore = bmuName.replace(/-/g, '_');
  const parts = withUnderscore.split('_');
  if (parts.length > 1) {
    const firstCapital = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const restLowercase = parts.slice(1).map(p => p.toLowerCase());
    variants.add([firstCapital, ...restLowercase].join('_'));
  }
  
  // Also try first word capital, rest lowercase with hyphen
  const partsHyphen = bmuName.split('-');
  if (partsHyphen.length > 1) {
    const firstCapital = partsHyphen[0].charAt(0).toUpperCase() + partsHyphen[0].slice(1).toLowerCase();
    const restLowercase = partsHyphen.slice(1).map(p => p.toLowerCase());
    variants.add([firstCapital, ...restLowercase].join('-'));
  }
  
  return Array.from(variants);
};

/**
 * Normalize array of BMU names for database queries
 * Generates all possible variants to ensure we find matches regardless of format
 * @param bmuNames - Array of BMU names in display format
 * @returns Array of all possible BMU name variants
 */
export const normalizeBmusForQuery = (bmuNames: string[]): string[] => {
  const allVariants: string[] = [];
  bmuNames.forEach(bmu => {
    allVariants.push(...generateBmuVariants(bmu));
  });
  return allVariants;
};

/**
 * Normalize array of BMU names for display
 * @param bmuNames - Array of BMU names in database format
 * @returns Array of BMU names in display format
 */
export const normalizeBmusForDisplay = (bmuNames: string[]): string[] => {
  return bmuNames.map(normalizeBmuForDisplay);
};

/**
 * Case-insensitive BMU name matcher that handles both formats
 * @param bmuName1 - First BMU name
 * @param bmuName2 - Second BMU name
 * @returns True if the names match (ignoring case and hyphen/underscore differences)
 */
export const bmuNamesMatch = (bmuName1: string, bmuName2: string): boolean => {
  const normalize = (name: string) => 
    name.toLowerCase().replace(/[-_]/g, '').trim();
  
  return normalize(bmuName1) === normalize(bmuName2);
};

/**
 * Find BMU name in array using flexible matching
 * @param searchName - BMU name to search for
 * @param bmuArray - Array of BMU names to search in
 * @returns Matching BMU name from array, or null if not found
 */
export const findBmuInArray = (searchName: string, bmuArray: string[]): string | null => {
  return bmuArray.find(bmu => bmuNamesMatch(searchName, bmu)) || null;
};

