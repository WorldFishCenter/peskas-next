// Site classifications and fisher days configuration
export const ISLAND_SITES = ['Kibuyuni', 'Shimoni', 'Vanga', 'Mkwiro', 'Wasini'];

export const FISHER_DAYS = {
  FRINGING: 220, // days per year
  ISLAND: 210    // days per year
};

// Check if a site is an island seascape
export const isIslandSite = (siteName: string): boolean => {
  return ISLAND_SITES.some(island => 
    siteName.toLowerCase().includes(island.toLowerCase())
  );
};

// Get annual fisher days for a site
export const getAnnualFisherDays = (siteName: string): number => {
  return isIslandSite(siteName) ? FISHER_DAYS.ISLAND : FISHER_DAYS.FRINGING;
};

// Get monthly fisher days (assuming even distribution across months)
export const getMonthlyFisherDays = (siteName: string): number => {
  const annualDays = getAnnualFisherDays(siteName);
  return Math.round(annualDays / 12);
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
  }
}; 