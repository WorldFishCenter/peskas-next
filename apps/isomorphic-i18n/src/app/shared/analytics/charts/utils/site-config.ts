// Site classifications
export const ISLAND_SITES = ['Kibuyuni', 'Shimoni', 'Vanga', 'Mkwiro', 'Wasini', 'Jimbo'];

// Check if a site is an island seascape
export const isIslandSite = (siteName: string): boolean => {
  return ISLAND_SITES.some(island => 
    siteName.toLowerCase().includes(island.toLowerCase())
  );
};

// Historical baseline data for comparisons
export const BASELINE_DATA = {
  CPUA: {
    CURRENT: {
      FRINGING: 11.5, // kg/km²
      ISLAND: 14.1    // kg/km²
    },
    MSY: {
      FRINGING: 25.5, // kg/km²
      ISLAND: 19.5    // kg/km²
    }
  },
  REVENUE_PER_AREA: {
    CURRENT: {
      FRINGING: 2847, // KES
      ISLAND: 2938    // KES  
    },
    MSY: {
      FRINGING: 6305, // KES
      ISLAND: 4056    // KES
    }
  },
  INCOME: {
    POVERTY_LINE: 312,          // KES/day
    NATIONAL_MINIMUM_WAGE: 938, // KES/day
    LIVING_WAGE: 1247          // KES/day
  },
  EFFORT: {
    // BMU-specific effort baselines (fishers/km²/day)
    'Uyombo': 2.5,
    'Vipingo': 2.2,
    'Kijangwani': 4.7,
    'Kuruwitu': 4.8,
    'Bureni': 2.2,
    'Mkunumbi': 2.2,
    'Kanamai': 4.6,
    'Mtwapa': 4.6,
    'Marina': 4.6,
    'Mamba': 4.6,
    'Kenyatta': 4.6,
    'Reef': 4.6,
    'Msumarini': 4.6,
    'Nyali': 4.6,
    'Shelty Timbx': 2.5,
    'Tradewinds': 1.0,
    'Mtwape': 4.6,
    'Mvuleni': 4.6,
    'Pikwanyaza': 4.6,
    'Rhapta': 4.6,
    'Bamburi': 4.6,
    'Gazi': 4.6,
    'Jumiani': 1.0,
    'Mkwiro': 4.7,
    'Wasini': 4.6,
    'Vavaro': 4.7,
    'Yanga': 1.0,
    'Jimbo': 1.0,
    'Vanga': 1.0,
    'Kibuyuni': 1.0
  },
  CPUE: {
    // BMU-specific CPUE baselines (kg/fisher/day)
    'Uyombo': 3.80,
    'Vipingo': 3.80,
    'Kijangwani': 4.19,
    'Kuruwitu': 3.64,
    'Bureni': 2.59,
    'Mkunumbi': 2.59,
    'Kanamai': 3.64,
    'Mtwapa': 3.27,
    'Marina': 3.27,
    'Mamba': 3.27,
    'Kenyatta': 3.64,
    'Reef': 3.64,
    'Msumarini': 3.64,
    'Nyali': 3.64,
    'Shelty Timbx': 3.80,
    'Tradewinds': 2.43,
    'Mtwape': 3.64,
    'Mvuleni': 3.64,
    'Pikwanyaza': 3.64,
    'Rhapta': 3.64,
    'Bamburi': 3.64,
    'Gazi': 3.27,
    'Jumiani': 2.43,
    'Mkwiro': 4.19,
    'Wasini': 3.64,
    'Vavaro': 4.19,
    'Yanga': 2.43,
    'Jimbo': 2.43,
    'Vanga': 2.43,
    'Kibuyuni': 2.43
  },
  CPUA_BMU_SPECIFIC: {
    // BMU-specific CPUA baselines (kg/km²/day)
    'Uyombo': 11.5,
    'Vipingo': 11.5,
    'Kijangwani': 11.5,
    'Kuruwitu': 11.5,
    'Bureni': 11.5,
    'Mkunumbi': 11.5,
    'Kanamai': 11.5,
    'Mtwapa': 11.5,
    'Marina': 11.5,
    'Mamba': 11.5,
    'Kenyatta': 11.5,
    'Reef': 11.5,
    'Msumarini': 11.5,
    'Nyali': 11.5,
    'Shelty Timbx': 11.5,
    'Tradewinds': 11.5,
    'Mtwape': 11.5,
    'Mvuleni': 11.5,
    'Pikwanyaza': 11.5,
    'Rhapta': 11.5,
    'Bamburi': 11.5,
    'Gazi': 11.5,
    'Jumiani': 11.5,
    'Mkwiro': 14.1,    
    'Wasini': 14.1,
    'Vavaro': 14.1,
    'Yanga': 14.1,
    'Jimbo': 14.1,
    'Vanga': 14.1,
    'Kibuyuni': 14.1
  }
};

// Helper function to get effort baseline for a specific BMU
export const getEffortBaseline = (bmuName: string): number | null => {
  // Normalize BMU name for case-insensitive lookup
  const normalizedName = bmuName.trim();

  // Direct lookup
  if (normalizedName in BASELINE_DATA.EFFORT) {
    return BASELINE_DATA.EFFORT[normalizedName as keyof typeof BASELINE_DATA.EFFORT];
  }

  // Case-insensitive fallback
  const key = Object.keys(BASELINE_DATA.EFFORT).find(
    k => k.toLowerCase() === normalizedName.toLowerCase()
  );

  return key ? BASELINE_DATA.EFFORT[key as keyof typeof BASELINE_DATA.EFFORT] : null;
};

// Helper function to get CPUE baseline for a specific BMU
export const getCpueBaseline = (bmuName: string): number | null => {
  // Normalize BMU name for case-insensitive lookup
  const normalizedName = bmuName.trim();

  // Direct lookup
  if (normalizedName in BASELINE_DATA.CPUE) {
    return BASELINE_DATA.CPUE[normalizedName as keyof typeof BASELINE_DATA.CPUE];
  }

  // Case-insensitive fallback
  const key = Object.keys(BASELINE_DATA.CPUE).find(
    k => k.toLowerCase() === normalizedName.toLowerCase()
  );

  return key ? BASELINE_DATA.CPUE[key as keyof typeof BASELINE_DATA.CPUE] : null;
};

// Helper function to get BMU-specific CPUA baseline
export const getCpuaBaseline = (bmuName: string): number | null => {
  // Normalize BMU name for case-insensitive lookup
  const normalizedName = bmuName.trim();

  // Direct lookup
  if (normalizedName in BASELINE_DATA.CPUA_BMU_SPECIFIC) {
    return BASELINE_DATA.CPUA_BMU_SPECIFIC[normalizedName as keyof typeof BASELINE_DATA.CPUA_BMU_SPECIFIC];
  }

  // Case-insensitive fallback
  const key = Object.keys(BASELINE_DATA.CPUA_BMU_SPECIFIC).find(
    k => k.toLowerCase() === normalizedName.toLowerCase()
  );

  return key ? BASELINE_DATA.CPUA_BMU_SPECIFIC[key as keyof typeof BASELINE_DATA.CPUA_BMU_SPECIFIC] : null;
}; 