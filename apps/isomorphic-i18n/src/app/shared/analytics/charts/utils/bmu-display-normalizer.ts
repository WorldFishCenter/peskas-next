/**
 * BMU Display Name Normalization
 * 
 * Ensures consistent display of BMU names across all charts and UI components
 * Converts database format (e.g., "Shelly_timbwani") to display format (e.g., "Shelly-Timbwani")
 */

/**
 * Normalize BMU name for display
 * Converts: "Shelly_timbwani" → "Shelly-Timbwani"
 * 
 * @param bmuName - BMU name in database format (underscore, mixed case)
 * @returns BMU name in display format (hyphen, properly capitalized)
 */
export const normalizeBmuForDisplay = (bmuName: string): string => {
  if (!bmuName) return bmuName;
  
  // Convert underscores to hyphens and capitalize each word
  return bmuName
    .replace(/_/g, '-')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('-');
};

/**
 * Normalize BMU names in chart data keys for display
 * Used to transform data object keys before rendering in charts
 * 
 * @param data - Chart data point with BMU names as keys
 * @returns New data object with normalized BMU name keys
 */
export const normalizeChartDataKeys = (data: Record<string, any>): Record<string, any> => {
  const normalized: Record<string, any> = {};
  
  Object.entries(data).forEach(([key, value]) => {
    // Don't normalize special keys
    if (key === 'date' || key === 'average' || key === 'historical_average' || 
        key === 'difference' || key === 'isAboveAverage' || key === 'actualValue' ||
        key === 'individualFisher') {
      normalized[key] = value;
    } else {
      // Normalize BMU name keys
      normalized[normalizeBmuForDisplay(key)] = value;
    }
  });
  
  return normalized;
};

/**
 * Normalize site colors object keys for display
 * Used to transform siteColors object keys before passing to chart components
 * 
 * @param siteColors - Object mapping BMU names to colors
 * @returns New object with normalized BMU name keys
 */
export const normalizeSiteColors = (siteColors: Record<string, string>): Record<string, string> => {
  const normalized: Record<string, string> = {};
  
  Object.entries(siteColors).forEach(([key, value]) => {
    // Don't normalize special keys
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
 * Used to transform visibilityState object keys to match normalized chart data
 * 
 * @param visibilityState - Object mapping BMU names to visibility settings
 * @returns New object with normalized BMU name keys
 */
export const normalizeVisibilityState = (visibilityState: Record<string, any>): Record<string, any> => {
  const normalized: Record<string, any> = {};
  
  Object.entries(visibilityState).forEach(([key, value]) => {
    // Check if key ends with Positive/Negative for split bar visualization
    if (key.endsWith('Positive') || key.endsWith('Negative')) {
      const suffix = key.endsWith('Positive') ? 'Positive' : 'Negative';
      const baseName = key.slice(0, -(suffix.length));
      // Don't normalize special keys
      if (baseName === 'average' || baseName === 'historical_average' || baseName === 'individualFisher') {
        normalized[key] = value;
      } else {
        normalized[normalizeBmuForDisplay(baseName) + suffix] = value;
      }
    } 
    // Don't normalize special keys
    else if (key === 'average' || key === 'historical_average' || key === 'individualFisher') {
      normalized[key] = value;
    } else {
      normalized[normalizeBmuForDisplay(key)] = value;
    }
  });
  
  return normalized;
};

/**
 * Get display name for a BMU (for use in tooltips, labels, etc.)
 * 
 * @param bmuName - BMU name in any format
 * @returns Display-friendly name
 */
export const getBmuDisplayName = (bmuName: string): string => {
  // Handle special keys
  if (bmuName === 'average') return 'Average';
  if (bmuName === 'historical_average') return 'Historical Average';
  if (bmuName === 'individualFisher') return 'Your Performance';
  
  return normalizeBmuForDisplay(bmuName);
};

