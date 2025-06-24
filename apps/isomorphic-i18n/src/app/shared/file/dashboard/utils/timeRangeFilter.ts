import { TimeRangeOption } from "@/app/components/filter-selector";

/**
 * Get the start date based on the selected time range
 * @param timeRange - The selected time range option
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns The start date for filtering
 */
export function getTimeRangeStartDate(timeRange: TimeRangeOption, referenceDate: Date = new Date()): Date | null {
  const date = new Date(referenceDate);
  
  switch (timeRange) {
    case '3months':
      date.setMonth(date.getMonth() - 3);
      return date;
    
    case '6months':
      date.setMonth(date.getMonth() - 6);
      return date;
    
    case '1year':
      date.setFullYear(date.getFullYear() - 1);
      return date;
    
    case 'all':
      return null; // No filtering for "all time"
    
    default:
      return null;
  }
}

/**
 * Filter an array of data points by the selected time range
 * @param data - Array of data points with date properties
 * @param timeRange - The selected time range option
 * @param dateField - The name of the date field in the data (default: 'date')
 * @returns Filtered array of data points
 */
export function filterDataByTimeRange<T extends Record<string, any>>(
  data: T[],
  timeRange: TimeRangeOption,
  dateField: string = 'date'
): T[] {
  const startDate = getTimeRangeStartDate(timeRange);
  
  // If "all time" is selected, return all data
  if (!startDate) {
    return data;
  }
  
  // Filter data based on the start date
  return data.filter(item => {
    const itemDate = new Date(item[dateField]);
    return itemDate >= startDate;
  });
}

/**
 * Check if a date is within the selected time range
 * @param date - The date to check
 * @param timeRange - The selected time range option
 * @returns Whether the date is within the range
 */
export function isDateInTimeRange(date: Date | string | number, timeRange: TimeRangeOption): boolean {
  const startDate = getTimeRangeStartDate(timeRange);
  
  // If "all time" is selected, all dates are valid
  if (!startDate) {
    return true;
  }
  
  const checkDate = new Date(date);
  return checkDate >= startDate;
}

/**
 * Get a human-readable description of the time range
 * @param timeRange - The selected time range option
 * @returns Description of the time range
 */
export function getTimeRangeDescription(timeRange: TimeRangeOption): string {
  switch (timeRange) {
    case '3months':
      return 'Last 3 months';
    case '6months':
      return 'Last 6 months';
    case '1year':
      return 'Last 12 months';
    case 'all':
      return 'All available data';
    default:
      return 'Unknown time range';
  }
} 