import { format } from 'date-fns';

export interface DataPoint {
  date: number | string;
  [key: string]: any;
}

/**
 * Aggregate data by month
 * @param data - Array of data points with date field
 * @param dateField - Name of the date field (default: 'date')
 * @param valueFields - Array of fields to aggregate
 * @returns Monthly aggregated data
 */
export const aggregateByMonth = <T extends DataPoint>(
  data: T[],
  dateField: string = 'date',
  valueFields: string[]
): Record<string, any>[] => {
  const monthlyData: Record<string, any> = {};

  data.forEach(item => {
    const date = new Date(item[dateField]);
    const monthKey = format(date, 'yyyy-MM');
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        date: new Date(`${monthKey}-01`).getTime(),
        month: monthKey,
        count: 0,
      };
      
      // Initialize value fields
      valueFields.forEach(field => {
        monthlyData[monthKey][`${field}_sum`] = 0;
        monthlyData[monthKey][`${field}_values`] = [];
      });
    }
    
    monthlyData[monthKey].count += 1;
    
    // Aggregate value fields
    valueFields.forEach(field => {
      const value = item[field];
      if (value !== null && value !== undefined && !isNaN(Number(value))) {
        monthlyData[monthKey][`${field}_sum`] += Number(value);
        monthlyData[monthKey][`${field}_values`].push(Number(value));
      }
    });
  });

  // Calculate averages and return sorted by date
  return Object.values(monthlyData)
    .map(monthData => {
      const result: any = {
        date: monthData.date,
        month: monthData.month,
        count: monthData.count,
      };

      valueFields.forEach(field => {
        const values = monthData[`${field}_values`];
        if (values.length > 0) {
          const sum = monthData[`${field}_sum`];
          result[field] = Number((sum / values.length).toFixed(2));
          result[`${field}_total`] = sum;
        } else {
          result[field] = null;
          result[`${field}_total`] = 0;
        }
      });

      return result;
    })
    .sort((a, b) => a.date - b.date);
};

/**
 * Aggregate data by year
 * @param data - Array of data points with date field
 * @param dateField - Name of the date field (default: 'date')
 * @param valueFields - Array of fields to aggregate
 * @returns Yearly aggregated data
 */
export const aggregateByYear = <T extends DataPoint>(
  data: T[],
  dateField: string = 'date',
  valueFields: string[]
): Record<string, any>[] => {
  const yearlyData: Record<string, any> = {};

  data.forEach(item => {
    const date = new Date(item[dateField]);
    const year = date.getFullYear();
    
    if (!yearlyData[year]) {
      yearlyData[year] = {
        date: new Date(`${year}-01-01`).getTime(),
        year,
        count: 0,
      };
      
      // Initialize value fields
      valueFields.forEach(field => {
        yearlyData[year][`${field}_sum`] = 0;
        yearlyData[year][`${field}_values`] = [];
      });
    }
    
    yearlyData[year].count += 1;
    
    // Aggregate value fields
    valueFields.forEach(field => {
      const value = item[field];
      if (value !== null && value !== undefined && !isNaN(Number(value))) {
        yearlyData[year][`${field}_sum`] += Number(value);
        yearlyData[year][`${field}_values`].push(Number(value));
      }
    });
  });

  // Calculate averages and return sorted by year
  return Object.values(yearlyData)
    .map(yearData => {
      const result: any = {
        date: yearData.date,
        year: yearData.year,
        count: yearData.count,
      };

      valueFields.forEach(field => {
        const values = yearData[`${field}_values`];
        if (values.length > 0) {
          const sum = yearData[`${field}_sum`];
          result[field] = Number((sum / values.length).toFixed(2));
          result[`${field}_total`] = sum;
        } else {
          result[field] = null;
          result[`${field}_total`] = 0;
        }
      });

      return result;
    })
    .sort((a, b) => a.date - b.date);
};

/**
 * Calculate performance metrics
 * @param current - Current value
 * @param baseline - Baseline value for comparison
 * @param max - Maximum value in dataset (for percentage calculation)
 * @returns Performance metrics object
 */
export const calculatePerformanceMetrics = (
  current: number,
  baseline: number,
  max?: number
) => {
  const difference = current - baseline;
  const percentageChange = baseline !== 0 ? (difference / baseline) * 100 : 0;
  const percentageOfMax = max && max !== 0 ? (current / max) * 100 : 0;

  return {
    current: Number(current.toFixed(2)),
    baseline: Number(baseline.toFixed(2)),
    difference: Number(difference.toFixed(2)),
    percentageChange: Number(percentageChange.toFixed(2)),
    percentageOfMax: Number(percentageOfMax.toFixed(2)),
    isPositive: difference > 0,
    isImprovement: difference > 0, // Can be customized based on metric type
  };
};

/**
 * Calculate rolling average for time series data
 * @param data - Array of data points
 * @param field - Field to calculate rolling average for
 * @param windowSize - Size of rolling window (default: 3)
 * @returns Data with rolling average field added
 */
export const addRollingAverage = <T extends DataPoint>(
  data: T[],
  field: string,
  windowSize: number = 3
): any[] => {
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  return sortedData.map((item, index) => {
    const startIndex = Math.max(0, index - windowSize + 1);
    const window = sortedData.slice(startIndex, index + 1);
    const values = window
      .map(d => d[field])
      .filter(v => v !== null && v !== undefined && !isNaN(Number(v)));
    
    const rollingAvg = values.length > 0 
      ? Number((values.reduce((sum, v) => sum + Number(v), 0) / values.length).toFixed(2))
      : null;
    
    return {
      ...item,
      [`${field}_rolling_avg`]: rollingAvg,
    };
  });
};

/**
 * Normalize values to a 0-1 scale
 * @param data - Array of data points
 * @param field - Field to normalize
 * @returns Data with normalized field added
 */
export const addNormalizedField = <T extends DataPoint>(
  data: T[],
  field: string
): any[] => {
  const values = data
    .map(d => d[field])
    .filter(v => v !== null && v !== undefined && !isNaN(Number(v)))
    .map(v => Number(v));
  
  if (values.length === 0) {
    return data.map(item => ({
      ...item,
      [`${field}_normalized`]: null,
    }));
  }
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  return data.map(item => {
    const value = item[field];
    const normalized = (range !== 0 && value !== null && value !== undefined && !isNaN(Number(value)))
      ? Number(((Number(value) - min) / range).toFixed(3))
      : null;
    
    return {
      ...item,
      [`${field}_normalized`]: normalized,
    };
  });
};

/**
 * Group data by a specific field
 * @param data - Array of data points
 * @param groupField - Field to group by
 * @returns Object with grouped data
 */
export const groupBy = <T extends DataPoint>(
  data: T[],
  groupField: string
): Record<string, T[]> => {
  return data.reduce((groups, item) => {
    const key = String(item[groupField] || 'unknown');
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

/**
 * Fill missing dates in time series data
 * @param data - Array of data points with date field
 * @param dateField - Name of the date field
 * @param fillValue - Value to use for missing dates (default: null)
 * @param interval - Interval to fill ('month' | 'day')
 * @returns Data with missing dates filled
 */
export const fillMissingDates = <T extends DataPoint>(
  data: T[],
  dateField: string = 'date',
  fillValue: any = null,
  interval: 'month' | 'day' = 'month'
): T[] => {
  if (data.length === 0) return [];
  
  const sortedData = [...data].sort((a, b) => 
    new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime()
  );
  
  const firstDate = new Date(sortedData[0][dateField]);
  const lastDate = new Date(sortedData[sortedData.length - 1][dateField]);
  
  const filledData: T[] = [];
  const existingDates = new Set(
    sortedData.map(d => format(new Date(d[dateField]), interval === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd'))
  );
  
  let currentDate = new Date(firstDate);
  if (interval === 'month') {
    currentDate.setDate(1); // Set to first day of month
  }
  
  while (currentDate <= lastDate) {
    const dateKey = format(currentDate, interval === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd');
    
    if (existingDates.has(dateKey)) {
      // Add existing data point
      const existingPoint = sortedData.find(d => 
        format(new Date(d[dateField]), interval === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd') === dateKey
      );
      if (existingPoint) {
        filledData.push(existingPoint);
      }
    } else {
      // Create missing data point
      const missingPoint = {
        [dateField]: currentDate.getTime(),
      } as T;
      
      // Fill other fields with specified fill value
      const samplePoint = sortedData[0];
      Object.keys(samplePoint).forEach(key => {
        if (key !== dateField) {
          (missingPoint as any)[key] = fillValue;
        }
      });
      
      filledData.push(missingPoint);
    }
    
    // Move to next date
    if (interval === 'month') {
      currentDate.setMonth(currentDate.getMonth() + 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return filledData;
};

/**
 * Calculate trend line for data points
 * @param data - Array of data points
 * @param xField - X-axis field name
 * @param yField - Y-axis field name
 * @returns Trend line coefficients and data points
 */
export const calculateTrendLine = <T extends DataPoint>(
  data: T[],
  xField: string = 'date',
  yField: string
) => {
  const validPoints = data
    .filter(d => d[xField] != null && d[yField] != null && !isNaN(Number(d[yField])))
    .map(d => ({
      x: new Date(d[xField]).getTime(),
      y: Number(d[yField])
    }));
  
  if (validPoints.length < 2) {
    return { slope: 0, intercept: 0, r2: 0, trendData: [] };
  }
  
  const n = validPoints.length;
  const sumX = validPoints.reduce((sum, p) => sum + p.x, 0);
  const sumY = validPoints.reduce((sum, p) => sum + p.y, 0);
  const sumXY = validPoints.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = validPoints.reduce((sum, p) => sum + p.x * p.x, 0);
  const sumY2 = validPoints.reduce((sum, p) => sum + p.y * p.y, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R-squared
  const meanY = sumY / n;
  const ssRes = validPoints.reduce((sum, p) => {
    const predicted = slope * p.x + intercept;
    return sum + Math.pow(p.y - predicted, 2);
  }, 0);
  const ssTot = validPoints.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
  const r2 = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
  
  // Generate trend line data points
  const trendData = validPoints.map(p => ({
    x: p.x,
    trendValue: Number((slope * p.x + intercept).toFixed(2))
  }));
  
  return {
    slope: Number(slope.toFixed(6)),
    intercept: Number(intercept.toFixed(2)),
    r2: Number(r2.toFixed(3)),
    trendData
  };
};