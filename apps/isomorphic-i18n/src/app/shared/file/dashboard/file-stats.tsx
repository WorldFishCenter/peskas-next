"use client";

import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState, useEffect, useMemo, useCallback } from "react";
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
import useUserPermissions from "./hooks/useUserPermissions";

type FileStatsType = {
  className?: string;
  lang?: string;
  bmu?: string;
};

interface ChartPoint {
  day: string;
  reference: number | null;
  others?: number | null;
  index: number;
  metricId: string;
}

interface StatData {
  id: string;
  title: string;
  metric: string;
  chart: ChartPoint[];
}

interface StatsResponse {
  effort: {
    current: number;
    percentage: number;
    trend: Array<{ day: string; sale: number | null }>;
  };
  cpue: {
    current: number;
    percentage: number;
    trend: Array<{ day: string; sale: number | null }>;
  };
  cpua: {
    current: number;
    percentage: number;
    trend: Array<{ day: string; sale: number | null }>;
  };
  rpue: {
    current: number;
    percentage: number;
    trend: Array<{ day: string; sale: number | null }>;
  };
  rpua: {
    current: number;
    percentage: number;
    trend: Array<{ day: string; sale: number | null }>;
  };
}

interface ComparisonValue {
  reference: number | null;
  others?: number | null;
  date: string;
}

interface HoveredPercentage {
  percentage: string;
  increased: boolean;
  monthComparison: string;
}

// Utility function to get month name from date string
const getMonthName = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 2) return dateStr;
  const year = parts[0];
  const month = parts[1];
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString('default', { month: 'short' });
};

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
  const [hoveredPercentages, setHoveredPercentages] = useState<{[key: string]: HoveredPercentage}>({});
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [comparisonValues, setComparisonValues] = useState<{[key: string]: ComparisonValue}>({});
  const [bmus] = useAtom(bmusAtom);
  
  // Get user permissions
  const {
    userBMU,
    isAdmin,
    hasRestrictedAccess,
    canCompareWithOthers,
    referenceBMU
  } = useUserPermissions();
  
  // Determine effective BMU and display name
  const effectiveBMU = useMemo(() => bmu || referenceBMU || userBMU, [bmu, referenceBMU, userBMU]);
  const displayName = useMemo(() => effectiveBMU || "All BMUs", [effectiveBMU]);
  
  // Memoize query parameters to prevent unnecessary refetches
  const referenceBmus = useMemo(() => 
    effectiveBMU ? [effectiveBMU] : (isAdmin ? bmus : (hasRestrictedAccess ? [effectiveBMU].filter(Boolean) as string[] : bmus)),
    [effectiveBMU, isAdmin, hasRestrictedAccess, bmus]
  );
  
  const otherBmus = useMemo(() => 
    canCompareWithOthers && effectiveBMU ? bmus.filter(b => b !== effectiveBMU) : [],
    [bmus, canCompareWithOthers, effectiveBMU]
  );
  
  // Fetch reference BMU data
  const { 
    data: statsData1, 
    isLoading: isLoading1, 
    error: error1 
  } = api.monthlyStats.allStats.useQuery({ bmus: referenceBmus }, {
    retry: 3,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5,
  }) as { data: StatsResponse | undefined, isLoading: boolean, error: any };
  
  // Fetch other BMUs data (only if needed)
  const { 
    data: statsData2, 
    isLoading: isLoading2, 
    error: error2 
  } = api.monthlyStats.allStats.useQuery({ bmus: otherBmus }, {
    retry: 3,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5,
    enabled: otherBmus.length > 0,
  }) as { data: StatsResponse | undefined, isLoading: boolean, error: any };

  // Define metrics once
  const metrics = useMemo(() => [
    { id: 'effort', field: 'effort', title: t('text-metrics-effort') },
    { id: 'catch-rate', field: 'cpue', title: t('text-metrics-catch-rate') },
    { id: 'catch-density', field: 'cpua', title: t('text-metrics-catch-density') },
    { id: 'fisher-revenue', field: 'rpue', title: t('text-metrics-fisher-revenue') },
    { id: 'area-revenue', field: 'rpua', title: t('text-metrics-area-revenue') }
  ] as const, [t]);

  // Process data with useMemo to avoid unnecessary recalculations
  const processedData = useMemo(() => {
    if (!statsData1 || isLoading1) return null;
    
    try {
      return metrics.map(metric => {
        const referenceMetric = statsData1?.[metric.field] || { current: 0, percentage: 0, trend: [] };
        const otherBmusMetric = statsData2?.[metric.field];
        const trend = referenceMetric.trend || [];

        // Initialize default percentage and comparison for the last two months
        let defaultPercentage = '';
        let defaultIncreased = false;
        let monthComparison = '';
        if (trend.length >= 2) {
          const lastValue = trend[trend.length - 1].sale;
          const previousValue = trend[trend.length - 2].sale;
          const lastMonth = getMonthName(trend[trend.length - 1].day);
          const prevMonth = getMonthName(trend[trend.length - 2].day);
          monthComparison = `${prevMonth} → ${lastMonth}`;
          
          if (previousValue !== null && previousValue !== undefined && previousValue !== 0 && 
              lastValue !== null && lastValue !== undefined) {
            const change = ((lastValue - previousValue) / previousValue) * 100;
            if (!isNaN(change)) {
              defaultPercentage = change > 0 ? `+${Math.round(change)}%` : `${Math.round(change)}%`;
              defaultIncreased = change > 0;
            }
          }
        }

        // Initialize hover percentages
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

        // Initialize comparison values
        if (trend.length > 0) {
          const lastPoint = trend[trend.length - 1];
          const lastOthersPoint = otherBmusMetric?.trend?.[otherBmusMetric.trend.length - 1];
          
          setComparisonValues(prev => ({
            ...prev,
            [metric.id]: {
              reference: lastPoint.sale === null || lastPoint.sale === undefined ? null : Math.round(lastPoint.sale),
              others: canCompareWithOthers && lastOthersPoint ? 
                (lastOthersPoint.sale === null || lastOthersPoint.sale === undefined ? 
                null : Math.round(lastOthersPoint.sale)) : undefined,
              date: getMonthName(lastPoint.day)
            }
          }));
        }

        // Create chart data points
        const chartData = trend.map((point, index) => ({
          day: point.day || '',
          reference: point.sale === null || point.sale === undefined ? null : point.sale,
          others: canCompareWithOthers && otherBmusMetric?.trend?.[index] ? 
            (otherBmusMetric.trend[index].sale === null || otherBmusMetric.trend[index].sale === undefined ? 
              null : otherBmusMetric.trend[index].sale) : null,
          index,
          metricId: metric.id
        }));

        return {
          id: metric.id,
          title: metric.title,
          metric: Math.round(referenceMetric.current || 0).toLocaleString(),
          chart: chartData
        };
      });
    } catch (error) {
      console.error("Error transforming data:", error);
      return null;
    }
  }, [statsData1, statsData2, metrics, canCompareWithOthers]);

  // Update state based on processed data
  useEffect(() => {
    setLoading(isLoading1 || isLoading2);
    
    if (error1 || error2) {
      console.error("API error:", error1 || error2);
      setError("Failed to load statistics data");
      setLoading(false);
      return;
    }
    
    if (!isLoading1 && !statsData1) {
      console.warn("No statistics data available");
      setError("No statistics data available");
      setLoading(false);
      return;
    }

    if (processedData) {
      setStatsData(processedData);
      setError(null);
      setLoading(false);
    }
  }, [processedData, isLoading1, isLoading2, error1, error2, statsData1]);

  // Memoized handlers to prevent unnecessary recreations
  const handleBarClick = useCallback((data: any) => {
    if (!data || !data.activePayload || data.activePayload.length === 0) return;
    
    const entry = data.activePayload[0];
    const metricId = entry.payload.metricId;
    const day = entry.payload.day;
    const currentIndex = entry.payload.index;
    const chartData = statsData.find(s => s.id === metricId)?.chart || [];
    
    setSelectedMonth(day);
    setComparisonValues(prev => ({
      ...prev,
      [metricId]: {
        reference: Math.round(entry.payload.reference),
        others: canCompareWithOthers ? Math.round(entry.payload.others || 0) : undefined,
        date: getMonthName(day)
      }
    }));

    // Update hoveredPercentages for clicked bar
    if (currentIndex > 0 && chartData.length > 0) {
      const currentMonth = getMonthName(day);
      const prevMonth = getMonthName(chartData[currentIndex - 1].day);
      const monthComparison = `${prevMonth} → ${currentMonth}`;
      
      const currentValue = entry.payload.reference;
      const previousValue = chartData[currentIndex - 1].reference;
      
      if (previousValue !== null && previousValue !== undefined && previousValue !== 0 && 
          currentValue !== null && currentValue !== undefined) {
        const change = ((currentValue - previousValue) / previousValue) * 100;
        if (!isNaN(change)) {
          const percentage = change > 0 ? `+${Math.round(change)}%` : `${Math.round(change)}%`;
          setHoveredPercentages(prev => ({
            ...prev,
            [metricId]: {
              percentage,
              increased: change > 0,
              monthComparison
            }
          }));
        }
      }
    }
  }, [canCompareWithOthers, statsData]);

  const handleMouseMove = useCallback((state: any) => {
    if (state.activePayload && state.activePayload.length > 0) {
      const entry = state.activePayload[0];
      const currentIndex = entry.payload.index;
      const metricId = entry.payload.metricId;
      const chartData = statsData.find(s => s.id === metricId)?.chart || [];
      
      if (currentIndex >= 0 && chartData.length > 0) {
        // Update comparison values
        setComparisonValues(prev => ({
          ...prev,
          [metricId]: {
            reference: Math.round(entry.payload.reference),
            others: canCompareWithOthers ? Math.round(entry.payload.others || 0) : undefined,
            date: getMonthName(entry.payload.day)
          }
        }));
        
        // Calculate percentage change
        if (currentIndex > 0) {
          const currentMonth = getMonthName(entry.payload.day);
          const prevMonth = getMonthName(chartData[currentIndex - 1].day);
          const monthComparison = `${prevMonth} → ${currentMonth}`;
          
          const currentValue = entry.payload.reference;
          const previousValue = chartData[currentIndex - 1].reference;
          
          if (previousValue !== null && previousValue !== undefined && previousValue !== 0 && 
              currentValue !== null && currentValue !== undefined) {
            const change = ((currentValue - previousValue) / previousValue) * 100;
            if (!isNaN(change)) {
              const percentage = change > 0 ? `+${Math.round(change)}%` : `${Math.round(change)}%`;
              setHoveredPercentages(prev => ({
                ...prev,
                [metricId]: {
                  percentage,
                  increased: change > 0,
                  monthComparison
                }
              }));
            }
          }
        }
      }
    }
  }, [canCompareWithOthers, statsData]);

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
            
            <div className="flex items-baseline gap-2 mt-0.5">
              <Text className="text-xl font-bold text-gray-900">
                {!comparisonValues[stat.id] ? stat.metric : 
                  (comparisonValues[stat.id]?.reference === null || comparisonValues[stat.id]?.reference === undefined ? 
                  "N/A" : comparisonValues[stat.id]?.reference?.toLocaleString() || "-")}
              </Text>
              {hoveredPercentages[stat.id] && (
                <span className="text-2xs text-gray-500">
                  {hoveredPercentages[stat.id].monthComparison}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 text-2xs mt-2 mb-0.5">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#fc3468]" />
                <span>{displayName}</span>
              </div>
              {canCompareWithOthers && effectiveBMU && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[rgba(178,216,216,0.75)]" />
                  <span>Other BMUs</span>
                </div>
              )}
            </div>
          </div>
          
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
                <Tooltip 
                  content={<></>}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="reference"
                  fill="#fc3468"
                  name={displayName}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={7}
                  minPointSize={3}
                  activeBar={{ fill: '#d81b4a', stroke: '#d81b4a', strokeWidth: 1 }}
                />
                {canCompareWithOthers && effectiveBMU && (
                  <Bar
                    dataKey="others"
                    fill="rgba(178, 216, 216, 0.75)"
                    name="Other BMUs"
                    radius={[2, 2, 0, 0]}
                    maxBarSize={7}
                    minPointSize={3}
                    activeBar={{ fill: 'rgba(128, 188, 188, 1)', stroke: 'rgba(128, 188, 188, 1)', strokeWidth: 1 }}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50/30 flex justify-between text-xs">
            <div className="flex flex-col">
              <span className="text-2xs text-gray-500">{displayName}</span>
              <span className="font-medium">
                {!comparisonValues[stat.id] ? "-" : 
                  (comparisonValues[stat.id]?.reference === null || comparisonValues[stat.id]?.reference === undefined ? 
                  "N/A" : comparisonValues[stat.id]?.reference?.toLocaleString() || "-")}
              </span>
            </div>
            {canCompareWithOthers && effectiveBMU && (
              <div className="flex flex-col">
                <span className="text-2xs text-gray-500">Other BMUs</span>
                <span className="font-medium">
                  {!comparisonValues[stat.id] ? "-" : 
                    (comparisonValues[stat.id]?.others === null || comparisonValues[stat.id]?.others === undefined ? 
                    "N/A" : comparisonValues[stat.id]?.others?.toLocaleString() || "-")}
                </span>
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