"use client";

import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { Button, Text } from "rizzui";
import cn from "@utils/class-names";
import { useScrollableSlider } from "@hooks/use-scrollable-slider";
import { PiCaretLeftBold, PiCaretRightBold } from "react-icons/pi";
import MetricCard from "@components/cards/metric-card";
import TrendingUpIcon from "@components/icons/trending-up";
import TrendingDownIcon from "@components/icons/trending-down";
import { useTranslation } from "@/app/i18n/client";
import { api } from "@/trpc/react";
import { bmusAtom } from "@/app/components/filter-selector";
import { useSession } from "next-auth/react";
import WidgetCard from "@components/cards/widget-card";

type FileStatsType = {
  className?: string;
  lang?: string;
  bmu?: string;
};

interface ChartPoint {
  day: string;
  reference: number;
  others?: number;
}

interface StatData {
  id: string;
  title: string;
  metric: string;
  increased?: boolean;
  decreased?: boolean;
  percentage?: string;
  chart: ChartPoint[];
}

interface StatsResponse {
  effort: {
    current: number;
    percentage: number;
    trend: Array<{ day: string; sale: number }>;
  };
  cpue: {
    current: number;
    percentage: number;
    trend: Array<{ day: string; sale: number }>;
  };
  cpua: {
    current: number;
    percentage: number;
    trend: Array<{ day: string; sale: number }>;
  };
  rpue: {
    current: number;
    percentage: number;
    trend: Array<{ day: string; sale: number }>;
  };
  rpua: {
    current: number;
    percentage: number;
    trend: Array<{ day: string; sale: number }>;
  };
}

const LoadingState = () => {
  return (
    <MetricCard
      title=""
      metric=""
      rounded="lg"
      chart={
        <div className="h-24 w-24 @[16.25rem]:h-28 @[16.25rem]:w-32 @xs:h-32 @xs:w-36 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Loading chart...</span>
          </div>
        </div>
      }
      chartClassName="flex flex-col w-auto h-auto text-center justify-center"
      className="min-w-[292px] w-full max-w-full flex flex-col items-center justify-center"
    />
  );
};

export function FileStatGrid({ className, lang, bmu }: { className?: string; lang?: string; bmu?: string }) {
  const { t } = useTranslation(lang!, "common");
  const [statsData, setStatsData] = useState<StatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPercentages, setHoveredPercentages] = useState<{[key: string]: {percentage: string, increased: boolean, monthComparison: string}}>({});
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [comparisonValues, setComparisonValues] = useState<{[key: string]: {reference: number, others?: number, date: string}}>({});
  const [bmus] = useAtom(bmusAtom);
  const { data: session } = useSession();

  // Check groups array exists before trying to use some()
  const hasGroups = Array.isArray(session?.user?.groups);
  const isCiaUser = hasGroups && session?.user?.groups?.some((group: { name: string }) => group.name === 'CIA');
  const isAdminUser = hasGroups && session?.user?.groups?.some((group: { name: string }) => group.name === 'Admin');
  
  // Log user session info for debugging
  console.log('User Session Debug:', {
    hasSession: !!session,
    hasGroups: hasGroups,
    groups: session?.user?.groups,
    isAdmin: isAdminUser,
    isCia: isCiaUser,
    userBmu: session?.user?.userBmu
  });
  
  // Get the active BMU from props or session
  const activeBmu = bmu || session?.user?.userBmu?.BMU || "Vipingo";
  
  // Display name based on user role
  const displayName = isAdminUser ? "All BMUs" : activeBmu;
  
  console.log('BMU Debug:', {
    bmuProp: bmu,
    activeBmu,
    userBmuFromSession: session?.user?.userBmu?.BMU,
    isAdmin: isAdminUser,
    isCia: isCiaUser,
    userBmuQuery: isAdminUser ? bmus : (bmu ? [bmu] : bmus),
    otherBmusQuery: (!isCiaUser && !isAdminUser && bmu) ? bmus.filter(b => b !== bmu) : []
  });
  
  // For admin users, we want all BMUs data together
  // For CIA users, we only need their BMU's data
  const { data: statsData1, isLoading: isLoading1, error: error1 } = api.monthlyStats.allStats.useQuery({ 
    bmus: isAdminUser ? bmus : (bmu ? [bmu] : bmus) // Fallback to all bmus if bmu is not provided
  }, {
    retry: 3,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5, // 5 minutes
  }) as { data: StatsResponse | undefined, isLoading: boolean, error: any };
  
  // Only fetch other BMUs data if not a CIA user and not an admin user
  const { data: statsData2, isLoading: isLoading2, error: error2 } = api.monthlyStats.allStats.useQuery({ 
    bmus: (!isCiaUser && !isAdminUser && bmu) ? bmus.filter(b => b !== bmu) : []
  }, {
    retry: 3,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !isCiaUser && !isAdminUser && !!bmu,
  }) as { data: StatsResponse | undefined, isLoading: boolean, error: any };

  // Monitor API responses (keeping this from refactor-charts for debugging)
  useEffect(() => {
    console.log('API Responses:', {
      statsData1,
      statsData2,
      isLoading1,
      isLoading2,
      error1,
      error2,
      userQuery: isAdminUser ? bmus : (bmu ? [bmu] : bmus),
      otherQuery: (!isCiaUser && !isAdminUser && bmu) ? bmus.filter(b => b !== bmu) : []
    });
  }, [statsData1, statsData2, isLoading1, isLoading2, error1, error2, isAdminUser, bmus, activeBmu, bmu, isCiaUser]);

  useEffect(() => {
    // Set loading state based on API query states
    setLoading(isLoading1 || isLoading2);
    
    // Set error state if any API calls failed
    if (error1 || error2) {
      console.error("API error:", error1 || error2);
      setError("Failed to load statistics data");
      setLoading(false);
      return;
    }
    
    // Handle case when no data is returned
    if (!isLoading1 && !statsData1) {
      console.warn("No statistics data available");
      setError("No statistics data available");
      setLoading(false);
      return;
    }

    if (!statsData1) {
      setLoading(true);
      return;
    }

    try {
      const metrics = [
        { id: 'effort', field: 'effort', title: t('text-metrics-effort') },
        { id: 'catch-rate', field: 'cpue', title: t('text-metrics-catch-rate') },
        { id: 'catch-density', field: 'cpua', title: t('text-metrics-catch-density') },
        { id: 'fisher-revenue', field: 'rpue', title: t('text-metrics-fisher-revenue') },
        { id: 'area-revenue', field: 'rpua', title: t('text-metrics-area-revenue') }
      ] as const;

      const getMonthName = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length < 2) return dateStr; // Already a month name
        const year = parts[0];
        const month = parts[1];
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleString('default', { month: 'short' });
      };
      
      const transformedStats = metrics.map(metric => {
        // Safely access properties with fallbacks for missing data
        const referenceMetric = statsData1?.[metric.field] || { current: 0, percentage: 0, trend: [] };
        const otherBmusMetric = statsData2?.[metric.field];
        const trend = referenceMetric.trend || [];

        // Calculate default percentage change between last two months
        let defaultPercentage = '';
        let defaultIncreased = false;
        let monthComparison = '';
        if (trend.length >= 2) {
          const lastValue = trend[trend.length - 1].sale;
          const previousValue = trend[trend.length - 2].sale;
          const lastMonth = getMonthName(trend[trend.length - 1].day);
          const prevMonth = getMonthName(trend[trend.length - 2].day);
          monthComparison = `${prevMonth} → ${lastMonth}`;
          
          if (previousValue && previousValue !== 0) {
            const change = ((lastValue - previousValue) / previousValue) * 100;
            if (!isNaN(change)) {
              defaultPercentage = change > 0 ? `+${Math.round(change)}%` : `${Math.round(change)}%`;
              defaultIncreased = change > 0;
            }
          }
        }

        // Set default percentage in hoveredPercentages
        if (defaultPercentage) {
          setHoveredPercentages(prev => ({
            ...prev,
            [metric.id]: {
              percentage: defaultPercentage,
              increased: defaultIncreased,
              monthComparison
            }
          }));
        }

        // Get the most recent month data for comparison values
        if (trend.length > 0) {
          const lastPoint = trend[trend.length - 1];
          const lastOthersPoint = otherBmusMetric?.trend?.[otherBmusMetric.trend.length - 1];
          
          setComparisonValues(prev => ({
            ...prev,
            [metric.id]: {
              reference: Math.round(lastPoint.sale || 0),
              others: !isAdminUser && !isCiaUser ? Math.round(lastOthersPoint?.sale || 0) : undefined,
              date: getMonthName(lastPoint.day)
            }
          }));
        }

        // Transform the trend data with safety checks for undefined values
        const chartData = trend.map((point, index) => ({
          day: point.day || '',
          reference: point.sale || 0,
          // Only include others for non-admin users
          others: !isAdminUser && !isCiaUser && otherBmusMetric?.trend?.[index]?.sale || 0,
          index,
          data: trend,
          metricId: metric.id
        }));

        return {
          id: metric.id,
          title: metric.title,
          metric: Math.round(referenceMetric.current || 0).toLocaleString(),
          chart: chartData
        };
      });

      setStatsData(transformedStats);
      setError(null);
    } catch (error) {
      console.error("Error transforming data:", error);
      setError("Error processing statistics data");
    } finally {
      setLoading(false);
    }
  }, [statsData1, statsData2, isLoading1, isLoading2, error1, error2, t, isCiaUser, isAdminUser, bmus, bmu]);

  const handleBarClick = (data: any) => {
    if (!data || !data.activePayload || data.activePayload.length === 0) return;
    
    const entry = data.activePayload[0];
    const metricId = entry.payload.metricId;
    const day = entry.payload.day;
    
    setSelectedMonth(day);
    setComparisonValues(prev => ({
      ...prev,
      [metricId]: {
        reference: Math.round(entry.payload.reference),
        others: (!isAdminUser && !isCiaUser) ? Math.round(entry.payload.others || 0) : undefined,
        date: getMonthName(day)
      }
    }));
  };
  
  const getMonthName = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 2) return dateStr; // Already a month name
    const year = parts[0];
    const month = parts[1];
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'short' });
  };
  
  const handleMouseMove = (state: any) => {
    if (state.activePayload && state.activePayload.length > 0) {
      const entry = state.activePayload[0];
      const currentIndex = entry.payload.index;
      const data = entry.payload.data;
      
      if (currentIndex > 0 && data) {
        const getMonthName = (dateStr: string) => {
          if (!dateStr) return '';
          const parts = dateStr.split('-');
          if (parts.length < 2) return dateStr; // Already a month name
          const year = parts[0];
          const month = parts[1];
          const date = new Date(parseInt(year), parseInt(month) - 1);
          return date.toLocaleString('default', { month: 'short' });
        };
        
        const currentMonth = getMonthName(data[currentIndex].day);
        const prevMonth = getMonthName(data[currentIndex - 1].day);
        const monthComparison = `${prevMonth} → ${currentMonth}`;
        
        const previousValue = data[currentIndex - 1].sale;
        if (previousValue && previousValue !== 0) {
          const change = ((entry.value - previousValue) / previousValue) * 100;
          if (!isNaN(change)) {
            const percentage = change > 0 ? `+${Math.round(change)}%` : `${Math.round(change)}%`;
            setHoveredPercentages(prev => ({
              ...prev,
              [entry.payload.metricId]: {
                percentage,
                increased: change > 0,
                monthComparison
              }
            }));
          }
        }
        
        // Update comparison values
        setComparisonValues(prev => ({
          ...prev,
          [entry.payload.metricId]: {
            reference: Math.round(entry.payload.reference),
            others: (!isAdminUser && !isCiaUser) ? Math.round(entry.payload.others || 0) : undefined,
            date: currentMonth
          }
        }));
      }
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <div className="min-w-[292px] w-full p-4 text-center text-gray-500">{error}</div>;
  if (!statsData.length) return <div className="min-w-[292px] w-full p-4 text-center text-gray-500">No data available</div>;

  return (
    <>
      {statsData.map((stat) => (
        <MetricCard
          key={stat.id}
          title=""
          metric={<></>}
          rounded="lg"
          className={cn(
            "@container text-[15px]",
            "min-w-[260px] w-full max-w-full flex-1 p-0 overflow-hidden",
            className
          )}
        >
          <div className="p-4">
            {/* Header: Title and Trend */}
            <div className="flex justify-between items-center w-full">
              <Text className="text-sm text-gray-700">{stat.title}</Text>
              {hoveredPercentages[stat.id] && (
                <span className={cn(
                  "inline-flex items-center text-sm font-medium",
                  hoveredPercentages[stat.id].increased ? "text-green-500" : "text-red-500"
                )}>
                  {hoveredPercentages[stat.id].increased ? (
                    <TrendingUpIcon className="me-1 h-4 w-4" />
                  ) : (
                    <TrendingDownIcon className="me-1 h-4 w-4" />
                  )}
                  {hoveredPercentages[stat.id].percentage}
                </span>
              )}
            </div>
            
            {/* Metric and Period */}
            <div className="flex items-baseline gap-2 mt-0.5">
              <Text className="text-xl font-bold text-gray-900">{stat.metric}</Text>
              {hoveredPercentages[stat.id] && (
                <span className="text-2xs text-gray-500">
                  {hoveredPercentages[stat.id].monthComparison}
                </span>
              )}
            </div>
            
            {/* Legend */}
            <div className="flex items-center gap-3 text-2xs mt-2 mb-0.5">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#fc3468]" />
                <span>{displayName}</span>
              </div>
              {(!isCiaUser && !isAdminUser) && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[rgba(178,216,216,0.75)]" />
                  <span>Other BMUs</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Chart */}
          <div className="h-24 w-full bg-gray-50/50 transition-colors duration-200 hover:bg-gray-100/60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={stat.chart}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                barSize={15}
                barGap={2}
                onMouseMove={handleMouseMove}
                onClick={handleBarClick}
                className="[&_.recharts-cartesian-grid]:hidden"
              >
                <XAxis dataKey="day" hide={true} scale="band" />
                <YAxis 
                  hide={true} 
                  domain={[(dataMin: number) => 0, (dataMax: number) => dataMax * 1.1]} 
                />
                <Bar
                  dataKey="reference"
                  fill="#fc3468"
                  name={displayName}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={7}
                  minPointSize={3}
                />
                {(!isCiaUser && !isAdminUser) && (
                  <Bar
                    dataKey="others"
                    fill="rgba(178, 216, 216, 0.75)"
                    name="Other BMUs"
                    radius={[2, 2, 0, 0]}
                    maxBarSize={7}
                    minPointSize={3}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Current Values */}
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/30 flex justify-between text-xs">
            <div className="flex flex-col">
              <span className="text-2xs text-gray-500">{displayName}</span>
              <span className="font-medium">{comparisonValues[stat.id]?.reference || "-"}</span>
            </div>
            {(!isCiaUser && !isAdminUser) && (
              <div className="flex flex-col">
                <span className="text-2xs text-gray-500">Other BMUs</span>
                <span className="font-medium">{comparisonValues[stat.id]?.others || "-"}</span>
              </div>
            )}
          </div>
        </MetricCard>
      ))}
    </>
  );
}

export default function FileStats({ className, lang, bmu }: FileStatsType) {
  const {
    sliderEl,
    sliderPrevBtn,
    sliderNextBtn,
    scrollToTheRight,
    scrollToTheLeft,
  } = useScrollableSlider();

  return (
    <div className={cn("relative flex w-auto items-center overflow-hidden", className)}>
      <Button
        title="Prev"
        variant="text"
        ref={sliderPrevBtn}
        onClick={() => scrollToTheLeft()}
        className="!absolute -left-1 top-0 z-10 !h-full w-20 !justify-start rounded-none bg-gradient-to-r from-gray-0 via-gray-0/70 to-transparent px-0 ps-1 text-gray-500 hover:text-gray-900 3xl:hidden dark:from-gray-50 dark:via-gray-50/70"
      >
        <PiCaretLeftBold className="h-5 w-5" />
      </Button>
      <div className="w-full overflow-hidden">
        <div
          ref={sliderEl}
          className="custom-scrollbar-x grid grid-flow-col gap-5 overflow-x-auto scroll-smooth 2xl:gap-6 3xl:gap-8"
        >
          <FileStatGrid className="min-w-[292px]" lang={lang} bmu={bmu} />
        </div>
      </div>
      <Button
        title="Next"
        variant="text"
        ref={sliderNextBtn}
        onClick={() => scrollToTheRight()}
        className="!absolute right-0 top-0 z-10 !h-full w-20 !justify-end rounded-none bg-gradient-to-l from-gray-0 via-gray-0/70 to-transparent px-0 text-gray-500 hover:text-gray-900 3xl:hidden dark:from-gray-50 dark:via-gray-50/70"
      >
        <PiCaretRightBold className="h-5 w-5" />
      </Button>
    </div>
  );
}