import { ChartDataPoint } from "./types";
import { TickProps } from "./types";
import { CustomYAxisTick } from "./components";

// Standard color function for all charts - using consistent mapping without hardcoding BMUs
export const generateColor = (index: number, site: string, referenceBmu: string | undefined): string => {
  // Special case for reference BMU
  if (site === referenceBmu) {
    return "#fc3468"; // Red color for reference BMU
  }
  
  // Special cases for non-BMU series
  if (site === "average") {
    return "#64748b"; // Slate gray for average
  }
  
  if (site === "historical_average") {
    return "#94a3b8"; // Light slate gray for historical average
  }
  
  // Standard color palette
  const colors = [
    "#0c526e", // Dark blue
    "#f09609", // Orange
    "#2563eb", // Blue
    "#16a34a", // Green
    "#9333ea", // Purple
    "#ea580c", // Dark orange
    "#0891b2", // Teal
  ];
  
  // Use a simple hash of the BMU name to determine its color
  // This ensures the same BMU always gets the same color regardless of order
  const hash = site.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);
  
  // Use absolute value and modulo to pick a color from our palette
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

export const getBarColor = (baseColor: string, isPositive: boolean): string => {
  // For positive values, use the original color
  if (isPositive) {
    return baseColor;
  }
  
  // For negative values, use a darker shade of the color
  return baseColor === "#fc3468" ? "#d71e50" : baseColor;
};

export const calculateTrendline = (data: { date: number; difference?: number }[]) => {
  if (data.length === 0) return { slope: 0, intercept: 0 };

  // Calculate means
  const meanX = data.reduce((sum: number, point) => sum + point.date, 0) / data.length;
  const meanY = data.reduce((sum: number, point) => sum + (point.difference ?? 0), 0) / data.length;

  // Calculate slope using covariance and variance
  const numerator = data.reduce((sum: number, point) => {
    return sum + (point.date - meanX) * ((point.difference ?? 0) - meanY);
  }, 0);

  const denominator = data.reduce((sum: number, point) => {
    return sum + Math.pow(point.date - meanX, 2);
  }, 0);

  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;

  // Calculate monthly slope for display
  const msPerMonth = 30 * 24 * 60 * 60 * 1000;
  const monthlySlope = slope * msPerMonth;

  return { 
    slope,           // For the visualization
    intercept,       // For the visualization
    displaySlope: monthlySlope  // For display purposes
  };
};

export const getRecentData = (chartData: ChartDataPoint[], isCiaUser: boolean) => {
  if (!chartData.length) return [];
  
  const sortedData = [...chartData].sort((a, b) => b.date - a.date);
  const lastSixMonths = sortedData.slice(0, 6).reverse();
  
  // For CIA users who don't have access to average, just return the data as is
  if (isCiaUser) return lastSixMonths;
  
  // Check if we only have one BMU (excluding 'date' and 'average')
  const firstDataPoint = lastSixMonths[0] || {};
  const bmuKeys = Object.keys(firstDataPoint).filter(key => 
    key !== 'date' && key !== 'average'
  );
  
  // Count BMUs with actual values in the dataset
  const activeBMUs = new Set();
  lastSixMonths.forEach(item => {
    bmuKeys.forEach(key => {
      if (item[key] !== undefined && item[key] !== null) {
        activeBMUs.add(key);
      }
    });
  });
  
  // Calculate 6-month average for each BMU
  const bmuSixMonthAverages: Record<string, number> = {};
  
  // Calculate averages only for active BMUs
  activeBMUs.forEach(bmu => {
    const values = lastSixMonths
      .map(item => item[bmu as string])
      .filter(value => value !== undefined && value !== null);
    
    if (values.length > 0) {
      const sum = values.reduce((acc: number, val) => acc + (val as number), 0);
      bmuSixMonthAverages[bmu as string] = sum / values.length;
    }
  });
  
  // Overall average across all BMUs for the 6-month period
  const overallAverage = Object.values(bmuSixMonthAverages).reduce((sum: number, avg) => sum + avg, 0) / 
                         Object.values(bmuSixMonthAverages).length || 0;
  
  // For each month, calculate the difference from the 6-month average
  const result = lastSixMonths.map(item => {
    const result: { [key: string]: any } = { 
      date: item.date,
      // Add the average property to indicate we're showing relative values
      average: overallAverage 
    };
    
    // For each BMU, calculate the difference from its 6-month average
    activeBMUs.forEach(bmuKey => {
      const key = bmuKey as string;
      const value = item[key];
      
      if (value !== undefined && value !== null) {
        const bmuAverage = bmuSixMonthAverages[key] || 0;
        result[key] = parseFloat((value - bmuAverage).toFixed(2));
      }
    });
    
    return result;
  });
  
  // Sort by date to ensure chronological order
  return result.sort((a, b) => a.date - b.date);
};

export const getAnnualData = (chartData: ChartDataPoint[], isCiaUser: boolean, siteColors: Record<string, string>): ChartDataPoint[] => {
  if (!chartData.length) return [];
  
  // Group data by year
  const yearlyData: Record<number, { date: number; [key: string]: any }> = {};
  
  // First, ensure we have entries for all years in our dataset
  const allYears = Array.from(new Set(chartData.map(item => new Date(item.date).getFullYear())));
  const allSites = Object.keys(siteColors).filter(site => site !== "average" && site !== "historical_average");
  
  // Ensure we have entries for all years and all BMUs
  allYears.forEach(year => {
    const yearTimestamp = new Date(`${year}-01-01`).getTime();
    yearlyData[year] = { date: yearTimestamp };
    
    // Initialize all BMUs with null values
    allSites.forEach(site => {
      yearlyData[year][`${site}_sum`] = 0;
      yearlyData[year][`${site}_count`] = 0;
    });
  });
  
  // Now populate the data
  chartData.forEach(item => {
    const year = new Date(item.date).getFullYear();
    
    // Process each BMU value
    Object.entries(item).forEach(([key, value]) => {
      if (key !== 'date' && key !== 'average' && key !== 'historical_average' && value !== undefined) {
        if (!yearlyData[year][`${key}_sum`]) {
          yearlyData[year][`${key}_sum`] = 0;
          yearlyData[year][`${key}_count`] = 0;
        }
        yearlyData[year][`${key}_sum`] += value;
        yearlyData[year][`${key}_count`] += 1;
      }
    });
  });
  
  // Calculate averages for each year and BMU
  const result: ChartDataPoint[] = Object.entries(yearlyData).map(([_, data]) => {
    const yearResult: ChartDataPoint = { date: data.date };
    
    // Get all BMU keys (removing the _sum and _count suffix)
    const bmuKeys = Object.keys(data)
      .filter(key => key.endsWith('_sum'))
      .map(key => key.replace('_sum', ''));
    
    bmuKeys.forEach(key => {
      const sum = data[`${key}_sum`];
      const count = data[`${key}_count`];
      if (count > 0) {
        yearResult[key] = parseFloat((sum / count).toFixed(2));
      } else {
        // If no data for this BMU in this year, set to undefined instead of 0
        yearResult[key] = undefined;
      }
    });
    
    // For non-CIA users, calculate the average across all BMUs
    if (!isCiaUser) {
      const bmuValues = Object.entries(yearResult)
        .filter(([key]) => key !== 'date' && key !== 'average')
        .map(([_, value]) => value as number)
        .filter(val => val !== undefined && val > 0); // Only consider positive values
        
      if (bmuValues.length > 0) {
        yearResult.average = parseFloat((bmuValues.reduce((sum: number, val) => sum + val, 0) / bmuValues.length).toFixed(2));
      } else {
        yearResult.average = undefined;
      }
    }
    // For CIA users, calculate historical average if we have multiple years
    else if (isCiaUser && bmuKeys.length > 0 && allYears.length > 1) {
      // Use the first BMU key as the primary one for CIA users
      const primaryBmuKey = bmuKeys[0];
      if (yearResult[primaryBmuKey] !== undefined) {
        yearResult.historical_average = yearResult[primaryBmuKey];
      }
    }
    
    return yearResult;
  });
  
  // Sort by year
  return result.sort((a, b) => a.date - b.date);
}; 