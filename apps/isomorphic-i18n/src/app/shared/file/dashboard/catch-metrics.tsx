import WidgetCard from "@components/cards/widget-card";
import { useAtom } from "jotai";
import { useEffect, useState, useCallback, useRef } from "react";
import React, { createContext, useContext, useMemo } from "react";

import { bmusAtom } from "@/app/components/filter-selector";
import { useTranslation } from "@/app/i18n/client";
import { api } from "@/trpc/react";
import { useMedia } from "@hooks/use-media";
import SimpleBar from "@ui/simplebar";
import { useSession } from "next-auth/react";

import { 
  MetricKey, 
  MetricOption, 
  METRIC_OPTIONS, 
  ChartDataPoint, 
  ApiDataPoint, 
  VisibilityState 
} from "./charts/types";
import { generateColor, getAnnualData, getRecentData } from "./charts/utils";
import MetricSelector from "./charts/MetricSelector";
import CustomLegend from "./charts/CustomLegend";
// Import the chart components
import TrendsChart from "./charts/TrendsChart";
import ComparisonChart from "./charts/ComparisonChart";
import AnnualChart from "./charts/AnnualChart";
import { getClientLanguage } from "@/app/i18n/language-link";
// Import shared permissions hook
import useUserPermissions from "./hooks/useUserPermissions";

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
  onMetricChange: (metric: MetricKey) => void;
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

export default function CatchMetricsChart({
  className,
  lang,
  selectedMetric,
  onMetricChange,
  bmu,
  activeTab = 'standard', // Keep the original default for backwards compatibility
  onTabChange,
}: CatchMetricsChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [fiveYearMarks, setFiveYearMarks] = useState<number[]>([]);
  const [visibilityState, setVisibilityState] = useState<VisibilityState>({});
  const [siteColors, setSiteColors] = useState<Record<string, string>>({});

  // Map old tab names to new ones for backwards compatibility
  const getNewTabName = (oldTab: string) => {
    if (oldTab === 'standard') return 'trends';
    if (oldTab === 'recent') return 'comparison';
    return oldTab;
  };

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
      
      // Trigger a refresh without changing active tab
      setLoading(true);
      setTimeout(() => setLoading(false), 50);
    };
    
    window.addEventListener('i18n-language-changed', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('i18n-language-changed', handleLanguageChange as EventListener);
    };
  }, [i18n]);

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

  const { data: monthlyData } = api.aggregatedCatch.monthly.useQuery({ bmus });

  // Reset to trends tab if CIA user somehow gets to comparison tab
  useEffect(() => {
    if (isCiaUser && (localActiveTab === 'comparison' || localActiveTab === 'recent')) {
      const newTab = 'trends';
      setLocalActiveTab(newTab);
      
      // Also notify parent component if needed
      if (onTabChange) {
        onTabChange(newTab === 'trends' ? 'standard' : newTab);
      }
    }
  }, [isCiaUser, localActiveTab, onTabChange]);

  // Keep in sync with parent component, handling old tab names too
  useEffect(() => {
    const newTabName = getNewTabName(activeTab);
    if (localActiveTab !== newTabName) {
      setLocalActiveTab(newTabName);
    }
  }, [activeTab]);

  // Ensure language is maintained during tab changes
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n, localActiveTab]);

  const handleLegendClick = (site: string) => {
    // Don't toggle visibility for the average line
    if (site === "average") return;
    
    setVisibilityState((prev) => {
      // Create a copy of the previous state
      const newState = { ...prev };
      
      // Toggle the clicked site
      newState[site] = {
        opacity: prev[site]?.opacity === 1 ? 0.2 : 1,
      };
      
      // For Comparison tab, we need to handle the Positive/Negative variants too
      if ((localActiveTab === 'comparison' || localActiveTab === 'recent') && canCompareWithOthers) {
        // Also update the positive and negative variants
        const positiveKey = `${site}Positive`;
        const negativeKey = `${site}Negative`;
        
        newState[positiveKey] = { opacity: newState[site].opacity };
        newState[negativeKey] = { opacity: newState[site].opacity };
      }
      
      return newState;
    });
  };

  // Handle tab changes while preserving language state
  const handleTabChange = (tab: string) => {
    // Don't allow CIA users to access comparison tab
    if (isCiaUser && (tab === 'comparison' || tab === 'recent')) {
      return;
    }
    
    // Save current language before tab change
    const currentClientLang = getClientLanguage();
    
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
  };

  // Update visibility state when changing tabs
  useEffect(() => {
    if ((localActiveTab === 'comparison' || localActiveTab === 'recent') && canCompareWithOthers) {
      // Make sure all BMUs have proper visibility state
      const newVisibilityState = { ...visibilityState };
      Object.keys(siteColors).forEach(site => {
        if (site !== 'average' && !newVisibilityState[site]) {
          newVisibilityState[site] = { opacity: site === effectiveBMU ? 1 : 0.2 };
        }
      });
      setVisibilityState(newVisibilityState);
    }
  }, [localActiveTab, canCompareWithOthers, siteColors, effectiveBMU, visibilityState]);

  // Process main data when monthlyData changes
  useEffect(() => {
    if (!monthlyData) return;

    try {
      // Get unique sites from the data
      const uniqueSites = Array.from(
        new Set(monthlyData.map((item: ApiDataPoint) => item.landing_site))
      );
      
      // Apply user permissions
      const accessibleSites = hasRestrictedAccess 
        ? getAccessibleBMUs(uniqueSites as string[])
        : uniqueSites;

      // Create color mapping for sites
      const newSiteColors = uniqueSites.reduce<Record<string, string>>(
        (acc, site, index) => ({
          ...acc,
          [site as string]: generateColor(index, site, effectiveBMU),
        }),
        {}
      );
      
      // Only add average for users who can compare
      if (canCompareWithOthers) {
        // Add color for average line
        newSiteColors["average"] = generateColor(0, "average", undefined);
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
      if ((localActiveTab === 'comparison' || localActiveTab === 'recent') && canCompareWithOthers) {
        uniqueSites.forEach(site => {
          initialVisibility[`${site}Positive`] = { opacity: initialVisibility[site].opacity };
          initialVisibility[`${site}Negative`] = { opacity: initialVisibility[site].opacity };
        });
      }
      
      // Only add average visibility for users who can compare
      if (canCompareWithOthers) {
        // Always show average line
        initialVisibility["average"] = { opacity: 1 };
      }
      
      setVisibilityState(initialVisibility);

      // Filter data from 2023 onwards
      const filteredData = monthlyData.filter((item: ApiDataPoint) => {
        const year = new Date(item.date).getFullYear();
        return year >= 2023;
      });

      // Group data by date
      const groupedData = filteredData.reduce<Record<string, ChartDataPoint>>(
        (acc, item: ApiDataPoint) => {
          const date = new Date(item.date).getTime();
          if (!acc[date]) {
            acc[date] = {
              date,
              ...uniqueSites.reduce(
                (sites, site) => ({ ...sites, [site]: undefined }),
                {}
              ),
            };
          }
          acc[date][item.landing_site] = item[selectedMetric];
          return acc;
        },
        {}
      );

      // Calculate average value for each date point - only for users who can compare
      if (canCompareWithOthers) {
        Object.keys(groupedData).forEach(dateKey => {
          const dateData = groupedData[dateKey];
          const values = Object.entries(dateData)
            .filter(([key, value]) => key !== "date" && value !== undefined)
            .map(([_, value]) => value as number);
          
          if (values.length > 0) {
            const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
            groupedData[dateKey].average = parseFloat(avg.toFixed(2));
          } else {
            // Ensure we have an average property even if it's 0
            groupedData[dateKey].average = 0;
          }
        });
      }

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
    } catch (error) {
      console.error("Error processing data:", error);
    } finally {
      setLoading(false);
    }
  }, [monthlyData, selectedMetric, effectiveBMU, hasRestrictedAccess, canCompareWithOthers, localActiveTab, getAccessibleBMUs]);

  // Calculate derived data when chartData changes
  useEffect(() => {
    if (chartData.length > 0) {
      setRecentData(getRecentData(chartData, !canCompareWithOthers) as ChartDataPoint[]);
      setAnnualData(getAnnualData(chartData, !canCompareWithOthers, siteColors));
    }
  }, [chartData, canCompareWithOthers, siteColors]);

  // Find the selected metric option
  const selectedMetricOption = METRIC_OPTIONS.find(
    (m) => m.value === selectedMetric
  );

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between w-full gap-3">
          <div className="w-full sm:w-auto">
            <MetricSelector
              selectedMetric={selectedMetric}
              onMetricChange={onMetricChange}
              selectedMetricOption={selectedMetricOption}
            />
          </div>
          <div className="hidden sm:block text-base font-medium text-gray-800 mx-auto">
            <div className="text-center">
              {localActiveTab === 'trends' || localActiveTab === 'standard' 
                ? t("text-monthly-trends-over-time")
                : localActiveTab === 'comparison' || localActiveTab === 'recent'
                  ? t("text-performance-vs-average") 
                  : t("text-yearly-summary")
              }
            </div>
            <div className="text-xs text-gray-500 text-center mt-1">
              {localActiveTab === 'trends' || localActiveTab === 'standard' 
                ? t("text-trends-explanation")
                : localActiveTab === 'comparison' || localActiveTab === 'recent'
                  ? t("text-comparison-explanation") 
                  : t("text-yearly-explanation")
              }
            </div>
          </div>
          {canCompareWithOthers && (
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
          )}
        </div>
      }
      className="h-full"
    >
      {/* Mobile-only title - shows on small screens */}
      <div className="sm:hidden text-center mb-4">
        <div className="text-base font-medium text-gray-800">
          {localActiveTab === 'trends' || localActiveTab === 'standard' 
            ? t("text-monthly-trends-over-time")
            : localActiveTab === 'comparison' || localActiveTab === 'recent'
              ? t("text-performance-vs-average") 
              : t("text-yearly-summary")
          }
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {localActiveTab === 'trends' || localActiveTab === 'standard' 
            ? t("text-trends-explanation")
            : localActiveTab === 'comparison' || localActiveTab === 'recent'
              ? t("text-comparison-explanation") 
              : t("text-yearly-explanation")
          }
        </div>
      </div>
      
      {/* Wrap all chart components in LanguageProvider */}
      <LanguageProvider lang={lang}>
        {/* Trends Chart */}
        {(localActiveTab === 'trends' || localActiveTab === 'standard') && (
          <SimpleBar>
            <TrendsChart
              chartData={chartData}
              selectedMetricOption={selectedMetricOption}
              siteColors={siteColors}
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
        {(localActiveTab === 'comparison' || localActiveTab === 'recent') && canCompareWithOthers && (
          <SimpleBar>
            <ComparisonChart
              chartData={recentData}
              selectedMetricOption={selectedMetricOption}
              siteColors={siteColors}
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
          </SimpleBar>
        )}
        
        {/* Annual Chart */}
        {localActiveTab === 'annual' && (
          <SimpleBar>
            <AnnualChart
              chartData={annualData}
              selectedMetricOption={selectedMetricOption}
              siteColors={siteColors}
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