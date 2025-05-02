"use client";
import WidgetCard from "@components/cards/widget-card";
import { useAtom } from "jotai";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import React, { createContext, useContext } from "react";

import { bmusAtom } from "@/app/components/filter-selector";
import { useTranslation } from "@/app/i18n/client";
import { api } from "@/trpc/react";
import { useMedia } from "@hooks/use-media";
import SimpleBar from "@ui/simplebar";
import { useSession } from "next-auth/react";

import { 
  ChartDataPoint, 
  VisibilityState,
  MetricOption,
  MetricKey
} from "./charts/types";
import { generateColor, getAnnualData, getRecentData } from "./charts/utils";
import CustomLegend from "./charts/CustomLegend";
// Import the chart components
import TrendsChart from "./charts/TrendsChart";
import ComparisonChart from "./charts/ComparisonChart";
import AnnualChart from "./charts/AnnualChart";
import { getClientLanguage } from "@/app/i18n/language-link";
// Import shared permissions hook
import useUserPermissions from "./hooks/useUserPermissions";
// Import the fish category selector component
import FishCategorySelector from "./charts/FishCategorySelector";

// Define FishCategoryKey type and options
export type FishCategoryKey = string;

export interface FishCategoryOption {
  label: string;
  value: FishCategoryKey;
  unit: string;
  description?: string;
}

// Create a helper type for the chart components that converts FishCategoryKey to MetricKey
type FishCategoryMetricOption = {
  label: string;
  value: MetricKey;
  unit: string;
  category: "catch" | "revenue";
};

// Helper function to convert FishCategoryOption to MetricOption for chart compatibility
const toMetricOption = (option: FishCategoryOption | undefined): FishCategoryMetricOption => ({
  label: option?.label || "Fish Category",
  value: option?.value as unknown as MetricKey, // Type assertion for compatibility
  unit: option?.unit || "kg",
  category: "catch" // All fish categories are catch data
});

export const FISH_CATEGORIES: FishCategoryOption[] = [
  { 
    label: "Goatfish", 
    value: "Goatfish", 
    unit: "kg",
    description: "Goatfish catch data" 
  },
  { 
    label: "Lobster", 
    value: "Lobster", 
    unit: "kg",
    description: "Lobster catch data" 
  },
  { 
    label: "Octopus", 
    value: "Octopus", 
    unit: "kg",
    description: "Octopus catch data" 
  },
  { 
    label: "Parrotfish", 
    value: "Parrotfish", 
    unit: "kg",
    description: "Parrotfish catch data" 
  },
  { 
    label: "Pelagics", 
    value: "Pelagics", 
    unit: "kg",
    description: "Pelagic fish catch data" 
  },
  { 
    label: "Rabbitfish", 
    value: "Rabbitfish", 
    unit: "kg",
    description: "Rabbitfish catch data" 
  },
  { 
    label: "Ray", 
    value: "Ray", 
    unit: "kg",
    description: "Ray catch data" 
  },
  { 
    label: "Rest Of Catch", 
    value: "Rest Of Catch", 
    unit: "kg",
    description: "Other fish species catch data" 
  },
  { 
    label: "Scavengers", 
    value: "Scavengers", 
    unit: "kg",
    description: "Scavenger fish catch data" 
  },
  { 
    label: "Shark", 
    value: "Shark", 
    unit: "kg",
    description: "Shark catch data" 
  },
];

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

interface FishCompositionChartProps {
  className?: string;
  lang?: string;
  selectedCategory: FishCategoryKey;
  onCategoryChange: (category: FishCategoryKey) => void;
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

export default function FishCompositionChart({
  className,
  lang,
  selectedCategory,
  onCategoryChange,
  bmu,
  activeTab = 'trends',
  onTabChange,
}: FishCompositionChartProps) {
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
  const previousCategoryRef = useRef<string>(selectedCategory);

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
  const effectiveBMU = useMemo(() => bmu || userBMU, [bmu, userBMU]);

  // Force refetch when bmus changes by adding bmus to the query key
  const { data: monthlyData, refetch } = api.fishDistribution.monthlyTrends.useQuery(
    { 
      bmus,
      categories: [selectedCategory]
    },
    {
      refetchOnMount: true, 
      refetchOnWindowFocus: false,
      retry: 3,
      enabled: bmus.length > 0 && selectedCategory.length > 0,
    }
  );

  // Track selectedCategory changes and force data reprocessing
  useEffect(() => {
    if (previousCategoryRef.current !== selectedCategory) {
      console.log('Category changed from', previousCategoryRef.current, 'to', selectedCategory);
      previousCategoryRef.current = selectedCategory;
      setChartData([]);
      setRecentData([]);
      setAnnualData([]);
      dataProcessed.current = false;
      setLoading(true);
    }
  }, [selectedCategory]);

  // Force refetch when bmus changes
  useEffect(() => {
    // Check if bmus array has changed
    if (JSON.stringify(previousBmus.current) !== JSON.stringify(bmus)) {
      console.log('BMUs changed, refetching data');
      setChartData([]);
      setRecentData([]);
      setAnnualData([]);
      dataProcessed.current = false;
      previousBmus.current = [...bmus];
      refetch();
    }
  }, [bmus, refetch]);

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
  }, [lang, i18n]);

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
    // Save current language before tab change
    const currentClientLang = getClientLanguage();
    
    if (prevTabRef.current === tab) return; // Avoid unnecessary updates
    prevTabRef.current = tab;
    
    // Set a data attribute on document to immediately communicate language
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-language', currentClientLang);
      document.documentElement.setAttribute('data-language-ready', 'true');
    }
    
    // Update local tab state
    setLocalActiveTab(tab);
    
    // Map back to old names when calling parent callback for backwards compatibility
    const oldTabName = tab === 'trends' ? 'standard' : tab === 'comparison' ? 'recent' : tab;
    
    // Call parent's onTabChange handler if provided
    if (onTabChange) {
      onTabChange(oldTabName);
      
      // Ensure language doesn't revert during tab change
      // This is crucial for Vercel/production environment
      setTimeout(() => {
        // Force the language to stay as selected by user
        if (i18n.language !== currentClientLang) {
          i18n.changeLanguage(currentClientLang);
        }
        
        // Re-trigger a language change event to ensure all components update
        window.dispatchEvent(new CustomEvent('i18n-language-changed', {
          detail: { language: currentClientLang }
        }));
      }, 10);
    }
  }, [i18n, onTabChange]);

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
    if (!monthlyData || bmus.length === 0) return;
    
    // Reset processing flag if category changed
    if (previousCategoryRef.current !== selectedCategory) {
      dataProcessed.current = false;
      previousCategoryRef.current = selectedCategory;
    }
    
    // Prevent re-processing data unnecessarily
    if (chartData.length > 0 && !loading && 
        JSON.stringify(previousBmus.current) === JSON.stringify(bmus) && 
        previousCategoryRef.current === selectedCategory) return;

    try {
      console.log("Processing fish distribution data:", monthlyData);
      
      // Find min and max dates in the data
      const allDates = monthlyData.map(month => {
        const date = new Date(month.date);
        date.setDate(1); // First day of month
        date.setHours(0, 0, 0, 0); // Normalize time
        return date.getTime();
      });
      
      // Determine date range
      const minDate = Math.min(...allDates);
      const maxDate = Math.max(...allDates);
      
      // Create a complete timeline of months
      const allMonths: number[] = [];
      const currentDate = new Date(minDate);
      
      while (currentDate.getTime() <= maxDate) {
        allMonths.push(new Date(currentDate).getTime());
        currentDate.setMonth(currentDate.getMonth() + 1); // Move to next month
      }
      
      // Create a map to track which sites have data for which months
      const dataMap: Record<string, Record<string, number>> = {};
      
      // First pass: collect all available data
      monthlyData.forEach(month => {
        const date = new Date(month.date);
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        const timestamp = date.getTime();
        
        // Initialize this date in the data map if needed
        if (!dataMap[timestamp]) {
          dataMap[timestamp] = {};
        }
        
        // Get landing site (BMU) from the data
        const landingSite = month.landing_site;
        
        // Skip if this BMU isn't in our list
        if (!bmus.includes(landingSite)) return;
        
        // Find the category that matches our selected category
        const categoryData = month.categories.find((cat: any) => cat.category === selectedCategory);
        
        // Add the data point if we have it
        if (categoryData && categoryData.total_catch !== undefined && categoryData.total_catch !== null) {
          dataMap[timestamp][landingSite] = categoryData.total_catch;
        }
      });
      
      // Build the ChartDataPoint objects for all months
      const groupedByDate: Record<string, ChartDataPoint> = {};
      
      // Create data points for all months in the range
      allMonths.forEach(timestamp => {
        groupedByDate[timestamp] = {
          date: timestamp
        };
        
        // Add data for each BMU - use undefined instead of 0 for missing data
        bmus.forEach(site => {
          const monthData = dataMap[timestamp];
          groupedByDate[timestamp][site] = monthData && monthData[site] !== undefined ? 
            monthData[site] : undefined;
        });
      });
      
      // Convert grouped data to array and sort by date
      const sortedData = Object.values(groupedByDate).sort((a, b) => a.date - b.date);
      
      // Get unique sites (BMUs) from the data
      const uniqueSites = Array.from(
        new Set(bmus)
      );
      
      // Apply user permissions
      const accessibleSites = hasRestrictedAccess 
        ? getAccessibleBMUs(uniqueSites)
        : uniqueSites;

      // Create color mapping for sites
      const newSiteColors = uniqueSites.reduce<Record<string, string>>(
        (acc, site, index) => ({
          ...acc,
          [site]: generateColor(index, site, effectiveBMU),
        }),
        {}
      );
      
      // Add special colors for averages - only include historical_average for CIA users
      newSiteColors["average"] = "#64748b"; // Standard average color
      if (isCiaUser) {
        newSiteColors["historical_average"] = "#94a3b8"; // Only add for CIA users
      }
      
      setSiteColors(newSiteColors);

      // Calculate average value for each date point
      sortedData.forEach(dataPoint => {
        const values: number[] = [];
        
        // Get all non-zero values for the average calculation
        uniqueSites.forEach(site => {
          // Use optional access pattern with nullish coalescing for TypeScript safety
          const value = dataPoint[site] ?? undefined;
          if (value !== undefined && value > 0) {
            values.push(value as number);
          }
        });
        
        // Calculate the average
        if (values.length > 0) {
          dataPoint.average = parseFloat((values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(2));
        } else {
          // Use undefined instead of 0 to show gaps in the chart
          dataPoint.average = undefined;
        }
      });
      
      // Set visibility state based on user's BMU
      const initialVisibility = uniqueSites.reduce<VisibilityState>(
        (acc, site) => ({
          ...acc,
          [site]: { 
            opacity: hasRestrictedAccess
              ? (accessibleSites.includes(site) ? 1 : 0.2)
              : (site === effectiveBMU ? 1 : 0.2) 
          },
        }),
        {}
      );
      
      // For Comparison tab, add visibility for positive and negative variants
      if ((localActiveTab === 'comparison' || localActiveTab === 'recent')) {
        uniqueSites.forEach(site => {
          initialVisibility[`${site}Positive`] = { opacity: initialVisibility[site].opacity };
          initialVisibility[`${site}Negative`] = { opacity: initialVisibility[site].opacity };
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

      // Calculate 5-year marks for the x-axis
      const allYears = sortedData.map((item: ChartDataPoint) =>
        new Date(item.date).getFullYear()
      );
      const minYear = Math.min(...allYears);
      const maxYear = Math.max(...allYears);
      
      // Match catch-metrics.tsx 5-year mark calculation
      const startYear = Math.floor(minYear / 5) * 5;
      const marks: number[] = [];

      for (let year = startYear; year <= maxYear + 5; year += 5) {
        const markDate = new Date(`${year}-01-01`);
        markDate.setHours(0, 0, 0, 0);
        marks.push(markDate.getTime());
      }

      setFiveYearMarks(marks);
      setChartData(sortedData);
      previousBmus.current = [...bmus];
      previousCategoryRef.current = selectedCategory;
    } catch (error) {
      console.error("Error processing data:", error);
    } finally {
      setLoading(false);
    }
  }, [monthlyData, selectedCategory, effectiveBMU, hasRestrictedAccess, getAccessibleBMUs, bmus, isCiaUser, localActiveTab]);

  // Calculate derived data when chartData changes
  useEffect(() => {
    if (chartData.length === 0) return;
    
    // Skip if already calculated
    if (recentData.length > 0 && annualData.length > 0) return;
    
    // For non-CIA users, use standard comparison
    if (canCompareWithOthers) {
      setRecentData(getRecentData(chartData, false) as ChartDataPoint[]);
    } 
    
    // Annual data is the same for all users
    setAnnualData(getAnnualData(chartData, !canCompareWithOthers, siteColors));
    
  }, [chartData, canCompareWithOthers, isCiaUser, effectiveBMU, siteColors, recentData.length, annualData.length]);

  // Find the selected category option
  const selectedCategoryOption = FISH_CATEGORIES.find(
    (c) => c.value === selectedCategory
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
      <WidgetCard title={t("text-fish-distribution")}>
        <div className="h-96 w-full flex items-center justify-center">
          <span className="text-sm text-gray-500">{t("text-no-data")}</span>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title={
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between w-full gap-3">
          <div className="w-full sm:w-auto">
            <FishCategorySelector
              selectedCategory={selectedCategory}
              onCategoryChange={onCategoryChange}
              selectedCategoryOption={selectedCategoryOption}
              fishCategories={FISH_CATEGORIES}
            />
          </div>
          <div className="hidden sm:block text-base font-medium text-gray-800 mx-auto">
            <div className="text-center">
              {getTabTitle(localActiveTab)}
            </div>
            <div className="text-xs text-gray-500 text-center mt-1">
              {getTabDescription(localActiveTab)}
            </div>
          </div>
          {/* Show tabs for all users */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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
              selectedMetricOption={toMetricOption(selectedCategoryOption)}
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
        
        {/* Comparison Chart */}
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
                selectedMetricOption={toMetricOption(selectedCategoryOption)}
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
              // CIA users get a different view
              <ComparisonChart
                chartData={recentData}
                selectedMetricOption={toMetricOption(selectedCategoryOption)}
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
              selectedMetricOption={toMetricOption(selectedCategoryOption)}
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