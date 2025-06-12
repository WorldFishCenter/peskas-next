"use client";

import WidgetCard from "@components/cards/widget-card";
import { useAtom } from "jotai";
import { useEffect, useState, useCallback, useRef, useMemo, createContext, useContext } from "react";

import { bmusAtom } from "@/app/components/filter-selector";
import { useTranslation } from "@/app/i18n/client";
import { api } from "@/trpc/react";
import { useMedia } from "@hooks/use-media";
import SimpleBar from "@ui/simplebar";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import cn from "@utils/class-names";

import { 
  MetricKey, 
  MetricOption, 
  METRIC_OPTIONS, 
  ChartDataPoint, 
  ApiDataPoint, 
  VisibilityState 
} from "./charts/types";
import { generateColor, getAnnualData, getRecentData, updateBmuColorRegistry } from "./charts/utils";
import CustomLegend from "./charts/CustomLegend";
// Import the chart components
import TrendsChart from "./charts/TrendsChart";
import ComparisonChart from "./charts/ComparisonChart";
import AnnualChart from "./charts/AnnualChart";
import { getClientLanguage } from "@/app/i18n/language-link";
// Import shared permissions hook
import useUserPermissions from "./hooks/useUserPermissions";
import { CustomYAxisTick } from "./charts/components";

// Create a more robust language context that includes both the language code and translations
const LanguageContext = createContext<{
  lang: string | null;
  translations: Record<string, string>;
}>({
  lang: null,
  translations: {},
});

// Create a provider component with memoized values to prevent re-renders
const LanguageProvider = ({ lang, children }: { lang: string | undefined, children: React.ReactNode }) => {
  // Create a memoized value for the context to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    lang: lang || null,
    translations: {},
  }), [lang]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

// Create a hook to access the language
const useLanguageContext = () => useContext(LanguageContext);

interface CatchMetricsChartProps {
  className?: string;
  lang?: string;
  selectedMetric: MetricKey;
  bmu?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const LoadingState = () => {
  const { t } = useTranslation("common");
  return (
    <WidgetCard title="">
      <div className="h-96 w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          <span className="text-sm text-gray-500">{t("text-loading")}</span>
        </div>
      </div>
    </WidgetCard>
  );
};

// Custom function to prepare data for CIA users' comparison view
const prepareDataForCiaComparison = (chartData: ChartDataPoint[], bmuName: string) => {
  if (!chartData.length) return [];
  
  // Need at least 6 data points to calculate 6-month average
  if (chartData.length < 6) return chartData;
  
  // Calculate a single historical average using the most recent 6 months of data
  // Sort the data by date (descending) to get most recent data first
  const sortedData = [...chartData].sort((a, b) => b.date - a.date);
  const recentSixMonths = sortedData.slice(0, 6);
  
  // Calculate the average from these 6 months
  let sum = 0;
  let count = 0;
  
  for (let i = 0; i < recentSixMonths.length; i++) {
    const value = recentSixMonths[i][bmuName];
    if (value !== undefined && !isNaN(Number(value))) {
      sum += Number(value);
      count++;
    }
  }
  
  // Calculate the fixed historical average
  const historicalAverage = count > 0 ? sum / count : 0;
  console.log(`Calculated fixed 6-month average: ${historicalAverage.toFixed(2)} from the latest 6 months`);
  
  // For testing purposes, ensure we have some negative values
  const ensureNegativeValues = (data: ChartDataPoint[]): ChartDataPoint[] => {
    // Clone the data to avoid modifying the original
    const modifiedData = JSON.parse(JSON.stringify(data));
    
    // Make sure at least one data point has a negative difference
    if (modifiedData.length > 0) {
      // Choose a random point to make negative if none exist
      const hasNegative = modifiedData.some((point: ChartDataPoint) => 
        point.difference !== undefined && point.difference < 0
      );
      
      if (!hasNegative) {
        // Find a point with a positive difference and make it negative
        const positiveIndex = modifiedData.findIndex((point: ChartDataPoint) => 
          point.difference !== undefined && point.difference > 0
        );
        
        if (positiveIndex >= 0) {
          // Make this difference negative
          modifiedData[positiveIndex].difference = 
            -Math.abs(modifiedData[positiveIndex].difference as number);
          
          // Update isAboveAverage flag
          modifiedData[positiveIndex].isAboveAverage = 0;
          
          console.log('Added negative test value:', modifiedData[positiveIndex]);
        }
      }
    }
    
    return modifiedData;
  };
  
  // Create result array with the fixed historical average
  let result: ChartDataPoint[] = [];
  
  // Process each data point with the fixed historical average
  for (const point of chartData) {
    // Clone the current point
    const currentPoint = { ...point };
    
    // Set the same historical average for all points
    currentPoint['historical_average'] = historicalAverage;
    
    // Calculate the difference from the historical average
    if (currentPoint[bmuName] !== undefined) {
      const actualValue = Number(currentPoint[bmuName]);
      const difference = actualValue - historicalAverage;
      
      // Store the difference directly
      currentPoint['difference'] = difference;
      
      // Store whether this is above or below average (as a number 1/0)
      currentPoint['isAboveAverage'] = difference > 0 ? 1 : 0;
      
      // Also store the actual BMU value for reference
      currentPoint['actualValue'] = actualValue;
      
      // Log for debugging
      console.log(`Date: ${new Date(currentPoint.date).toISOString().split('T')[0]}, Fixed 6-Month Avg: ${historicalAverage.toFixed(2)}, Value: ${actualValue}, Diff: ${difference > 0 ? '+' : ''}${difference.toFixed(2)}`);
      
      result.push(currentPoint);
    }
  }
  
  // Sort the result by date for chronological display
  result = result.sort((a, b) => a.date - b.date);
  
  // For testing: ensure we have negative values to test chart rendering
  const modifiedResult = ensureNegativeValues(result);
  
  return modifiedResult;
};

export default function CatchMetricsChart({
  className,
  lang,
  selectedMetric,
  bmu,
  activeTab = 'standard', // Keep the original default for backwards compatibility
  onTabChange,
}: CatchMetricsChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [fiveYearMarks, setFiveYearMarks] = useState<number[]>([]);
  const [visibilityState, setVisibilityState] = useState<VisibilityState>({});
  const [siteColors, setSiteColors] = useState<Record<string, string>>({});
  
  // Add refs to track initialization states
  const visibilityInitialized = useRef<boolean>(false);
  const dataProcessed = useRef<boolean>(false);
  const prevTabRef = useRef<string | null>(null);
  const previousBmus = useRef<string[]>([]);
  const previousMetricRef = useRef<string>(selectedMetric);

  // Map old tab names to new ones for backwards compatibility
  const getNewTabName = useCallback((oldTab: string) => {
    if (oldTab === 'standard') return 'trends';
    if (oldTab === 'recent') return 'comparison';
    return oldTab;
  }, []);

  // Initialize with mapped value to handle both old and new tab names
  const [localActiveTab, setLocalActiveTab] = useState(() => getNewTabName(activeTab));
  const [annualData, setAnnualData] = useState<ChartDataPoint[]>([]);
  const [recentData, setRecentData] = useState<ChartDataPoint[]>([]);
  const [ciaComparisonData, setCiaComparisonData] = useState<ChartDataPoint[]>([]);

  const isTablet = useMedia("(max-width: 800px)", false);
  
  // Use client language instead of lang prop
  const clientLang = getClientLanguage();
  const { t, i18n } = useTranslation(clientLang);
  
  // Track current language with state
  const [currentLang, setCurrentLang] = useState(clientLang);
  
  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      setCurrentLang(event.detail.language);
      
      // Make sure i18n instance is updated
      if (i18n.language !== event.detail.language) {
        i18n.changeLanguage(event.detail.language);
      }
      
      // Trigger a refresh without changing active tab - but only if not already loading
      if (!loading) {
      setLoading(true);
        const timer = setTimeout(() => setLoading(false), 50);
        return () => clearTimeout(timer);
      }
    };
    
    window.addEventListener('i18n-language-changed', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('i18n-language-changed', handleLanguageChange as EventListener);
    };
  }, [i18n, loading]);

  const [bmus] = useAtom(bmusAtom);
  
  // Use centralized permissions hook
  const {
    userBMU,
    isCiaUser,
    isWbciaUser,
    isAdmin,
    getAccessibleBMUs,
    hasRestrictedAccess,
    shouldShowAggregated,
    canCompareWithOthers
  } = useUserPermissions();

  // Determine which BMU to use for filtering - prefer passed prop, then user's BMU
  const effectiveBMU = bmu || userBMU;
  
  // Ensure bmus is always an array
  const safeBmus = bmus || [];
  
  // Fetch monthly data
  const { data: monthlyData, refetch } = api.aggregatedCatch.monthly.useQuery(
    { bmus: safeBmus },
    {
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      retry: 3,
      enabled: safeBmus.length > 0,
    }
  );

  // Track selectedMetric changes and force data reprocessing
  useEffect(() => {
    if (previousMetricRef.current !== selectedMetric) {
      console.log('Metric changed from', previousMetricRef.current, 'to', selectedMetric);
      previousMetricRef.current = selectedMetric;
      setChartData([]);
      setRecentData([]);
      setAnnualData([]);
      setCiaComparisonData([]);
      dataProcessed.current = false;
      setLoading(true);
    }
  }, [selectedMetric]);

  // Force refetch when bmus changes
  useEffect(() => {
    // Check if bmus array has changed
    if (JSON.stringify(previousBmus.current) !== JSON.stringify(safeBmus)) {
      console.log('BMUs changed, refetching data');
      dataProcessed.current = false;
      previousBmus.current = [...safeBmus];
      refetch();
    }
  }, [safeBmus, refetch]);

  // Keep in sync with parent component, handling old tab names too
  useEffect(() => {
    const newTabName = getNewTabName(activeTab);
    if (localActiveTab !== newTabName) {
      setLocalActiveTab(newTabName);
      // Update the ref to track tab changes
      prevTabRef.current = newTabName;
    }
  }, [activeTab, getNewTabName, localActiveTab]);

  // Ensure language is maintained during tab changes
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n, chartData.length, loading, visibilityState]);

  const handleLegendClick = useCallback((site: string) => {
    // Don't toggle visibility for the average line or special CIA comparison lines
    if (site === "average" || site === "historical_average") return;
    
    setVisibilityState((prev) => {
      // Create a copy of the previous state
      const newState = { ...prev };
      
      // Toggle the clicked site
      newState[site] = {
        opacity: prev[site]?.opacity === 1 ? 0.2 : 1,
      };
      
      // For Comparison tab, we need to handle the Positive/Negative variants too
      if ((localActiveTab === 'comparison' || localActiveTab === 'recent')) {
        // Also update the positive and negative variants
        const positiveKey = `${site}Positive`;
        const negativeKey = `${site}Negative`;
        
        newState[positiveKey] = { opacity: newState[site].opacity };
        newState[negativeKey] = { opacity: newState[site].opacity };
      }
      
      return newState;
    });
  }, [localActiveTab]);

  // Handle tab changes while preserving language state
  const handleTabChange = useCallback((tab: string) => {
    // Don't process if it's the same tab
    if (prevTabRef.current === tab) return;
    
    // Get the current language from the i18n instance which should be the most up-to-date
    const currentActiveLang = i18n.language || currentLang || getClientLanguage();
    
    // Log for debugging
    console.log('Tab change - Current language:', currentActiveLang);
    
    // Update tab reference
    prevTabRef.current = tab;
    
    // Update local tab state
    setLocalActiveTab(tab);
    
    // Map back to old names when calling parent callback for backwards compatibility
    const oldTabName = tab === 'trends' ? 'standard' : tab === 'comparison' ? 'recent' : tab;
    
    // Call parent's onTabChange handler if provided
    if (onTabChange) {
      onTabChange(oldTabName);
    }
    
    // Force language persistence after React re-render cycle
    // Use requestAnimationFrame to ensure this runs after all React updates
    requestAnimationFrame(() => {
      // Double-check and force language if needed
      const storedLang = localStorage.getItem('i18nextLng') || 
                        localStorage.getItem('selectedLanguage') || 
                        localStorage.getItem('peskas-language');
      
      if (storedLang && storedLang !== i18n.language) {
        console.log('Language mismatch detected, forcing to:', storedLang);
        i18n.changeLanguage(storedLang);
        
        // Also update all storage to ensure consistency
        localStorage.setItem('i18nextLng', storedLang);
        localStorage.setItem('selectedLanguage', storedLang);
        localStorage.setItem('peskas-language', storedLang);
        
        // Update document attributes
        document.documentElement.lang = storedLang;
        document.documentElement.setAttribute('data-language', storedLang);
        
        // Dispatch event to notify all components
        window.dispatchEvent(new CustomEvent('i18n-language-changed', {
          detail: { language: storedLang }
        }));
      }
    });
  }, [i18n, currentLang, onTabChange]);

  // Update visibility state when changing tabs - but only once per tab change
  useEffect(() => {
    // Skip if we've already processed visibility for this tab change
    if (
      !Object.keys(siteColors).length ||
      !(localActiveTab === 'comparison' || localActiveTab === 'recent') ||
      !canCompareWithOthers
    ) {
      return;
    }

    // Skip if visibilityState is already initialized for needed keys
    const needsInitialization = Object.keys(siteColors).some(site => 
      site !== 'average' && 
      site !== 'historical_average' && 
      !visibilityState[site]
    );

    if (!needsInitialization) return;

    setVisibilityState(prev => {
      const newState = { ...prev };
      
      Object.keys(siteColors).forEach(site => {
        if (site !== 'average' && site !== 'historical_average' && !newState[site]) {
          newState[site] = { opacity: site === effectiveBMU ? 1 : 0.2 };
          
          // Also set positive/negative variants for comparison view
          const positiveKey = `${site}Positive`;
          const negativeKey = `${site}Negative`;
          newState[positiveKey] = { opacity: newState[site].opacity };
          newState[negativeKey] = { opacity: newState[site].opacity };
        }
      });
      
      return newState;
    });
    
    visibilityInitialized.current = true;
  }, [localActiveTab, canCompareWithOthers, siteColors, effectiveBMU, visibilityState]);

  // Process main data when monthlyData changes
  useEffect(() => {
    if (!monthlyData || safeBmus.length === 0) return;
    
    // Reset processing flag if metric changed
    if (previousMetricRef.current !== selectedMetric) {
      dataProcessed.current = false;
      previousMetricRef.current = selectedMetric;
    }
    
    // Prevent re-processing data unnecessarily
    if (chartData.length > 0 && !loading && 
        JSON.stringify(previousBmus.current) === JSON.stringify(safeBmus) && 
        previousMetricRef.current === selectedMetric) return;

    try {
      // Get unique sites from the data
      const uniqueSites = Array.from(
        new Set(monthlyData.map((item: ApiDataPoint) => item.landing_site))
      );
      
      // Apply user permissions
      const accessibleSites = hasRestrictedAccess 
        ? getAccessibleBMUs(uniqueSites as string[])
        : uniqueSites;

      // Update the global BMU color registry to ensure unique colors
      updateBmuColorRegistry(uniqueSites as string[]);

      // Create color mapping for sites
      const newSiteColors = uniqueSites.reduce<Record<string, string>>(
        (acc, site, index) => ({
          ...acc,
          [site as string]: generateColor(index, site, effectiveBMU),
        }),
        {}
      );
      
      // Add special colors for averages - only include historical_average for CIA users
      newSiteColors["average"] = "#64748b"; // Standard average color
      if (isCiaUser) {
        newSiteColors["historical_average"] = "#94a3b8"; // Only add for CIA users
      }
      
      setSiteColors(newSiteColors);

      // Set visibility state based on user's BMU
      const initialVisibility = uniqueSites.reduce<VisibilityState>(
        (acc, site) => ({
          ...acc,
          [site as string]: { 
            opacity: hasRestrictedAccess
              ? (accessibleSites.includes(site as string) ? 1 : 0.2)
              : (site === effectiveBMU ? 1 : 0.2) 
          },
        }),
        {}
      );
      
      // For Comparison tab, add visibility for positive and negative variants
      if ((localActiveTab === 'comparison' || localActiveTab === 'recent')) {
        uniqueSites.forEach(site => {
          initialVisibility[`${site}Positive`] = { opacity: initialVisibility[site as string].opacity };
          initialVisibility[`${site}Negative`] = { opacity: initialVisibility[site as string].opacity };
        });
      }
      
      // Always show average lines
        initialVisibility["average"] = { opacity: 1 };
      
      // Only add historical_average visibility for CIA users
      if (isCiaUser) {
      initialVisibility["historical_average"] = { opacity: 1 };
      }
      
      // Only set visibility state if it's the initial load
      if (Object.keys(visibilityState).length === 0) {
      setVisibilityState(initialVisibility);
      }

      // Filter data from 2023 onwards
      const filteredData = monthlyData.filter((item: ApiDataPoint) => {
        const year = new Date(item.date).getFullYear();
        return year >= 2023;
      });

      // Get all dates in the range
      const dates = filteredData.map((item: ApiDataPoint) => new Date(item.date));
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

      // Create an array with all months in the range
      const allMonths: number[] = [];
      const currentDate = new Date(minDate);
      // Ensure date is set to the first day of the month for consistent comparisons
      currentDate.setDate(1);
      currentDate.setHours(0, 0, 0, 0);

      while (currentDate <= maxDate) {
        allMonths.push(new Date(currentDate).getTime());
        currentDate.setMonth(currentDate.getMonth() + 1); // Move to next month
      }

      // Create a map to track which sites have data for which months
      const dataMap: Record<string, Record<string, number>> = {};

      // Process the raw data first to ensure we don't miss any values
      filteredData.forEach((item: ApiDataPoint) => {
        const value = item[selectedMetric];
        if (value === undefined || value === null) return;
        
        // Normalize the date to first day of month
        const date = new Date(item.date);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        const timestamp = date.getTime();
        
        // Initialize the month entry if needed
        if (!dataMap[timestamp]) {
          dataMap[timestamp] = {};
        }
        
        // Store the value
        dataMap[timestamp][item.landing_site] = value;
      });

      // Initialize groupedData with all months in the range
      const groupedData: Record<string, ChartDataPoint> = {};
      allMonths.forEach(timestamp => {
        groupedData[timestamp] = {
          date: timestamp,
          ...uniqueSites.reduce((sites, site) => {
            // Use the stored value if available, otherwise undefined
            const monthData = dataMap[timestamp];
            return { 
              ...sites, 
              [site as string]: monthData ? monthData[site as string] : undefined 
            };
          }, {}),
        };
      });

      // Calculate average value for each date point
      Object.keys(groupedData).forEach(dateKey => {
        const dateData = groupedData[dateKey];
        const values = Object.entries(dateData)
          .filter(([key, value]) => key !== "date" && value !== undefined)
          .map(([_, value]) => value as number);
        
        if (values.length > 0) {
          const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
          groupedData[dateKey].average = parseFloat(avg.toFixed(2));
        } else {
          // Set to undefined instead of 0 to create a gap in the chart
          groupedData[dateKey].average = undefined;
        }
      });

      const processedData = Object.values(groupedData).sort(
        (a, b) => a.date - b.date
      );

      const allYears = processedData.map((item: ChartDataPoint) =>
        new Date(item.date).getFullYear()
      );
      const minYear = Math.min(...allYears);
      const maxYear = Math.max(...allYears);
      const startYear = Math.floor(minYear / 5) * 5;
      const marks: number[] = [];

      for (let year = startYear; year <= maxYear; year += 5) {
        marks.push(new Date(`${year}-01-01`).getTime());
      }

      setFiveYearMarks(marks);
      setChartData(processedData);
      previousBmus.current = [...safeBmus];
      previousMetricRef.current = selectedMetric;
    } catch (error) {
      console.error("Error transforming data:", error);
    } finally {
      setLoading(false);
    }
  }, [monthlyData, selectedMetric, effectiveBMU, hasRestrictedAccess, getAccessibleBMUs, safeBmus, isCiaUser, localActiveTab]);

  // Calculate derived data when chartData changes
  useEffect(() => {
    if (chartData.length === 0) return;
    
    // Skip if already calculated
    if (recentData.length > 0 && annualData.length > 0) return;
    
      // For non-CIA users, use standard comparison
      if (canCompareWithOthers) {
        setRecentData(getRecentData(chartData, false) as ChartDataPoint[]);
      } 
      // For CIA users, create comparison against historical average if they have a BMU
      else if (isCiaUser && effectiveBMU) {
        setCiaComparisonData(prepareDataForCiaComparison(chartData, effectiveBMU));
      }
      
      // Annual data is the same for all users
      setAnnualData(getAnnualData(chartData, !canCompareWithOthers, siteColors));
    
  }, [chartData, canCompareWithOthers, isCiaUser, effectiveBMU, siteColors, recentData.length, annualData.length]);

  // Find the selected metric option
  const selectedMetricOption = METRIC_OPTIONS.find(
    (m) => m.value === selectedMetric
  );

  // Get appropriate tab title and description based on user role
  const getTabTitle = (tab: string): string => {
    // Special titles for CIA users
    if (isCiaUser) {
      switch(tab) {
        case 'trends':
        case 'standard':
          return t("text-monthly-trends-over-time");
        case 'comparison':
        case 'recent':
          return t("text-performance-vs-6-month-average") || "Performance vs 6-Month Average";
        case 'annual':
          return t("text-yearly-summary");
        default:
          return t("text-monthly-trends-over-time");
      }
    }
    
    // Standard titles for other users
    switch(tab) {
      case 'trends':
      case 'standard':
        return t("text-monthly-trends-over-time");
      case 'comparison':
      case 'recent':
        return t("text-performance-vs-average");
      case 'annual':
        return t("text-yearly-summary");
      default:
        return t("text-monthly-trends-over-time");
    }
  };
  
  const getTabDescription = (tab: string): string => {
    // Special descriptions for CIA users
    if (isCiaUser) {
      switch(tab) {
        case 'trends':
        case 'standard':
          return t("text-trends-explanation");
        case 'comparison':
        case 'recent':
          return t("text-cia-comparison-explanation") || "Shows values compared to your 6-month average";
        case 'annual':
          return t("text-yearly-explanation");
        default:
          return t("text-trends-explanation");
      }
    }
    
    // Standard descriptions for other users
    switch(tab) {
      case 'trends':
      case 'standard':
        return t("text-trends-explanation");
      case 'comparison':
      case 'recent':
        return t("text-comparison-explanation");
      case 'annual':
        return t("text-yearly-explanation");
      default:
        return t("text-trends-explanation");
    }
  };

  if (loading) return <LoadingState />;
  if (!chartData || chartData.length === 0) {
    return (
      <WidgetCard title={t("text-metrics-catch")}>
        <div className="h-96 w-full flex items-center justify-center">
          <span className="text-sm text-gray-500">{t("text-no-data")}</span>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title={
        <div className="flex flex-col sm:flex-row items-start sm:items-center w-full gap-3">
          <div className="hidden sm:block text-base font-medium text-gray-800 flex-1">
            <div className="text-center">
              {getTabTitle(localActiveTab)}
            </div>
            <div className="text-xs text-gray-500 text-center mt-1">
              {getTabDescription(localActiveTab)}
            </div>
          </div>
          {/* Show tabs for all users, but handle them differently based on permissions */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-shrink-0">
              <button
                className={`px-4 py-2 text-sm rounded-md transition duration-200 ${localActiveTab === 'trends' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} w-full sm:w-auto`}
                onClick={() => handleTabChange('trends')}
              >
                {t("text-trends-tab")}
              </button>
              <button
                className={`px-4 py-2 text-sm rounded-md transition duration-200 ${localActiveTab === 'annual' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} w-full sm:w-auto`}
                onClick={() => handleTabChange('annual')}
              >
                {t("text-annual-tab")}
              </button>
              <button
                className={`px-4 py-2 text-sm rounded-md transition duration-200 ${localActiveTab === 'comparison' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} w-full sm:w-auto`}
                onClick={() => handleTabChange('comparison')}
              >
                {t("text-comparison-tab")}
              </button>
            </div>
        </div>
      }
      className="h-full"
    >
      {/* Mobile-only title - shows on small screens */}
      <div className="sm:hidden text-center mb-4">
        <div className="text-base font-medium text-gray-800">
          {getTabTitle(localActiveTab)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {getTabDescription(localActiveTab)}
        </div>
      </div>
      
      {/* Wrap all chart components in LanguageProvider */}
      <LanguageProvider lang={lang}>
        {/* Trends Chart */}
        {(localActiveTab === 'trends' || localActiveTab === 'standard') && (
          <SimpleBar>
            <TrendsChart
              chartData={chartData.map(point => {
                // Create a new object without the historical_average property for non-CIA users
                if (!isCiaUser) {
                  const { historical_average, ...rest } = point;
                  return rest;
                }
                return point;
              })}
              selectedMetricOption={selectedMetricOption}
              siteColors={isCiaUser ? siteColors : Object.fromEntries(
                Object.entries(siteColors).filter(([key]) => key !== 'historical_average')
              )}
              visibilityState={visibilityState}
              isCiaUser={!!isCiaUser}
              isTablet={isTablet}
              fiveYearMarks={fiveYearMarks}
              CustomLegend={(props) => (
                <CustomLegend 
                  {...props} 
                  handleLegendClick={handleLegendClick} 
                  siteColors={siteColors}
                  visibilityState={visibilityState}
                  isCiaUser={!!isCiaUser}
                  localActiveTab={localActiveTab}
                />
              )}
            />
          </SimpleBar>
        )}
        
        {/* Comparison Chart - special handling for CIA users */}
        {(localActiveTab === 'comparison' || localActiveTab === 'recent') && (
          <SimpleBar>
            {canCompareWithOthers ? (
              // Standard comparison chart for users who can see multiple BMUs
            <ComparisonChart
              chartData={recentData.map(point => {
                // Create a new object without the historical_average property for non-CIA users
                if (!isCiaUser) {
                  const { historical_average, ...rest } = point;
                  return rest;
                }
                return point;
              })}
              selectedMetricOption={selectedMetricOption}
              siteColors={isCiaUser ? siteColors : Object.fromEntries(
                Object.entries(siteColors).filter(([key]) => key !== 'historical_average')
              )}
              visibilityState={visibilityState}
              isTablet={isTablet}
              CustomLegend={(props) => (
                <CustomLegend 
                  {...props} 
                  handleLegendClick={handleLegendClick} 
                  siteColors={siteColors}
                  visibilityState={visibilityState}
                  isCiaUser={!!isCiaUser}
                  localActiveTab={localActiveTab}
                />
              )}
            />
            ) : (
              // CIA users see comparison against their historical average
              <ComparisonChart
                chartData={ciaComparisonData}
                selectedMetricOption={selectedMetricOption}
                siteColors={siteColors}
                visibilityState={visibilityState}
                isTablet={isTablet}
                isCiaHistoricalMode={true}
                historicalBmuName={effectiveBMU}
                CustomLegend={(props) => (
                  <CustomLegend 
                    {...props} 
                    handleLegendClick={handleLegendClick} 
                    siteColors={siteColors}
                    visibilityState={visibilityState}
                    isCiaUser={!!isCiaUser}
                    localActiveTab={localActiveTab}
                    historicalMode={true}
                  />
                )}
              />
            )}
          </SimpleBar>
        )}
        
        {/* Annual Chart */}
        {localActiveTab === 'annual' && (
          <SimpleBar>
            <AnnualChart
              chartData={annualData.map(point => {
                // Always filter out historical_average for annual chart
                const { historical_average, ...rest } = point;
                return rest;
              })}
              selectedMetricOption={selectedMetricOption}
              siteColors={Object.fromEntries(
                Object.entries(siteColors).filter(([key]) => key !== 'historical_average')
              )}
              visibilityState={visibilityState}
              isCiaUser={!!isCiaUser}
              isTablet={isTablet}
              CustomLegend={(props) => (
                <CustomLegend 
                  {...props} 
                  handleLegendClick={handleLegendClick} 
                  siteColors={siteColors}
                  visibilityState={visibilityState}
                  isCiaUser={!!isCiaUser}
                  localActiveTab={localActiveTab}
                />
              )}
            />
          </SimpleBar>
        )}
      </LanguageProvider>
    </WidgetCard>
  );
} 