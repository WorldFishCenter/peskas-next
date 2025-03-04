"use client";

import { BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";
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
  const [hoveredPercentages, setHoveredPercentages] = useState<{[key: string]: {percentage: string, increased: boolean, monthComparison: string}}>({});
  const [bmus] = useAtom(bmusAtom);
  const { data: session } = useSession();

  // Determine if the user is part of the CIA group or Admin group
  const isCiaUser = session?.user?.groups?.some((group: { name: string }) => group.name === 'CIA');
  const isAdminUser = session?.user?.groups?.some((group: { name: string }) => group.name === 'Admin');
  
  // For admin users, we want all BMUs data together
  // For CIA users, we only need their BMU's data
  const { data: statsData1 } = api.monthlyStats.allStats.useQuery({ 
    bmus: isAdminUser ? bmus : (bmu ? [bmu] : [])
  }) as { data: StatsResponse | undefined };
  
  // Only fetch other BMUs data if not a CIA user and not an admin user
  const { data: statsData2 } = api.monthlyStats.allStats.useQuery({ 
    bmus: (!isCiaUser && !isAdminUser && bmu) ? bmus.filter(b => b !== bmu) : []
  }) as { data: StatsResponse | undefined };

  useEffect(() => {
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
        const referenceMetric = statsData1[metric.field];
        const otherBmusMetric = statsData2?.[metric.field];
        const trend = referenceMetric.trend;

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

        // Transform the trend data
        const chartData = trend.map((point, index) => ({
          day: point.day,
          reference: point.sale,
          // Only include others for non-admin users
          others: !isAdminUser && !isCiaUser && otherBmusMetric ? otherBmusMetric.trend[index]?.sale || 0 : undefined,
          index,
          data: trend,
          metricId: metric.id
        }));

        return {
          id: metric.id,
          title: metric.title,
          metric: Math.round(referenceMetric.current).toLocaleString(),
          chart: chartData
        };
      });

      setStatsData(transformedStats);
    } catch (error) {
      console.error("Error transforming data:", error);
    } finally {
      setLoading(false);
    }
  }, [statsData1, statsData2, t, isCiaUser, isAdminUser]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-2 py-1.5 border border-gray-200 shadow-lg rounded-lg min-w-[150px]">
          <div className="flex items-center gap-4">
            <p className="text-xs font-medium text-gray-700">{payload[0].payload.day}</p>
            <div className="flex items-center gap-3">
              {payload.map((entry: any) => {
                if (typeof entry.value !== 'number') return null;
                return (
                  <div key={entry.dataKey} className="flex items-center gap-1.5">
                    <div 
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <p className="text-xs font-medium text-gray-600 whitespace-nowrap">
                      {entry.name}: {Math.round(entry.value).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
    return null;
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
      }
    }
  };

  const handleMouseLeave = () => {
    // Don't clear percentages on mouse leave anymore
  };

  if (loading) return <LoadingState />;
  if (!statsData.length) return <LoadingState />;

  return (
    <>
      {statsData.map((stat) => (
        <MetricCard
          key={stat.id}
          title={stat.title}
          metric={stat.metric}
          rounded="lg"
          metricClassName="text-2xl mt-1"
          info={
            <div className="h-[40px] flex items-center">
              {hoveredPercentages[stat.id] ? (
                <Text className="flex items-center text-sm">
                  <Text
                    as="span"
                    className={cn(
                      "me-2 inline-flex items-center font-medium",
                      hoveredPercentages[stat.id].increased ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {hoveredPercentages[stat.id].increased ? (
                      <TrendingUpIcon className="me-1 h-4 w-4" />
                    ) : (
                      <TrendingDownIcon className="me-1 h-4 w-4" />
                    )}
                    {hoveredPercentages[stat.id].percentage}
                  </Text>
                  <span className="text-xs text-gray-500">{hoveredPercentages[stat.id].monthComparison}</span>
                </Text>
              ) : null}
            </div>
          }
          chart={
            <div className="h-24 w-24 @[16.25rem]:h-28 @[16.25rem]:w-32 @xs:h-32 @xs:w-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={stat.chart}
                  margin={{ top: 25, right: 2, bottom: 0, left: 2 }}
                  barSize={6}
                  barGap={2}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                >
                  <Bar
                    dataKey="reference"
                    fill="#fc3468"
                    name={isAdminUser ? "All BMUs" : (bmu || "Reference BMU")}
                    radius={[2, 2, 0, 0]}
                  />
                  {(!isCiaUser && !isAdminUser) && (
                    <Bar
                      dataKey="others"
                      fill="rgba(178, 216, 216, 0.75)"
                      name="Other BMUs"
                      radius={[2, 2, 0, 0]}
                    />
                  )}
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          }
          chartClassName="flex flex-col w-auto h-auto text-center"
          className={cn(
            "@container @7xl:text-[15px] [&>div]:items-end",
            "w-full max-w-full",
            className
          )}
        />
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
