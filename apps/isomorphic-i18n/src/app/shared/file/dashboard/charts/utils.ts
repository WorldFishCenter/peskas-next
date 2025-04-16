import { ChartDataPoint } from "./types";
import { TickProps } from "./types";
import { CustomYAxisTick } from "./components";

export const generateColor = (index: number, site: string, referenceBmu: string | undefined): string => {
  if (site === referenceBmu) {
    return "#fc3468"; // Red color for reference BMU
  }
  if (site === "average") {
    return "#000000"; // Black color for average line
  }
  const colors = [
    "#0c526e", // Dark blue
    "#f09609", // Orange
    "#2563eb", // Blue
    "#16a34a", // Green
    "#9333ea", // Purple
    "#ea580c", // Dark orange
    "#0891b2", // Teal
  ];
  return colors[index % colors.length];
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
  const meanX = data.reduce((sum, point) => sum + point.date, 0) / data.length;
  const meanY = data.reduce((sum, point) => sum + (point.difference ?? 0), 0) / data.length;

  // Calculate slope using covariance and variance
  const numerator = data.reduce((sum, point) => {
    return sum + (point.date - meanX) * ((point.difference ?? 0) - meanY);
  }, 0);

  const denominator = data.reduce((sum, point) => {
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
  
  // For regular users, transform the data to show difference from average
  const result = lastSixMonths.map(item => {
    const result: { [key: string]: any } = { date: item.date };
    
    // For each BMU, calculate the difference from average
    Object.entries(item).forEach(([key, value]) => {
      if (key !== 'date' && key !== 'average' && value !== undefined) {
        const average = item.average || 0;
        result[key] = parseFloat((value - average).toFixed(2));
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
  const allSites = Object.keys(siteColors).filter(site => site !== "average");
  
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
      if (key !== 'date' && key !== 'average' && value !== undefined) {
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
        yearResult[key] = sum / count;
      } else {
        // If no data for this BMU in this year, set to 0 or null
        yearResult[key] = 0;
      }
    });
    
    // For non-CIA users, calculate the average across all BMUs
    if (!isCiaUser) {
      const bmuValues = Object.entries(yearResult)
        .filter(([key]) => key !== 'date' && key !== 'average')
        .map(([_, value]) => value as number)
        .filter(val => val > 0); // Only consider positive values
        
      if (bmuValues.length > 0) {
        yearResult.average = bmuValues.reduce((sum, val) => sum + val, 0) / bmuValues.length;
      } else {
        yearResult.average = 0;
      }
    }
    
    return yearResult;
  });
  
  // Sort by year
  return result.sort((a, b) => a.date - b.date);
}; 