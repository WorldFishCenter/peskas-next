"use client";

import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAtom } from "jotai";
import { Button, Text } from "rizzui";
import cn from "@utils/class-names";
import { useScrollableSlider } from "@hooks/use-scrollable-slider";
import { PiCaretLeftBold, PiCaretRightBold } from "react-icons/pi";
import MetricCard from "@components/cards/metric-card";
import { useTranslation } from "@/app/i18n/client";
import { getClientLanguage } from "@/app/i18n/language-link";
import { api } from "@/trpc/react";
import useUserPermissions from "./hooks/useUserPermissions";
import { bmusAtom } from "@/app/components/filter-selector";

type FileStatsCIAType = {
  className?: string;
  lang?: string;
};

interface ChartPoint {
  bmu: string;
  value: number | null;
  index: number;
}

interface StatData {
  id: string;
  title: string;
  metric: string;
  unit: string;
  chart: ChartPoint[];
  userBMUValue?: number | null;
  monthName?: string;
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

export function FileStatWBCIAGrid({ className, lang }: { className?: string; lang?: string }) {
  // Use client language instead of lang prop
  const clientLang = getClientLanguage();
  const { t, i18n } = useTranslation(clientLang, "common");
  
  // Track current language with state
  const [currentLang, setCurrentLang] = useState(clientLang);
  
  const [statsData, setStatsData] = useState<StatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredBMU, setHoveredBMU] = useState<{[key: string]: { bmu: string; value: number | null }}>({});
  const [bmus] = useAtom(bmusAtom);
  
  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      setCurrentLang(event.detail.language);
      
      // Make sure i18n instance is updated
      if (i18n.language !== event.detail.language) {
        i18n.changeLanguage(event.detail.language);
      }
    };
    
    window.addEventListener('i18n-language-changed', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('i18n-language-changed', handleLanguageChange as EventListener);
    };
  }, [i18n]);
  
  // Get user permissions
  const { userBMU } = useUserPermissions();
  
  // Ensure bmus is always an array
  const safeBmus = bmus || [];
  
  // Fetch monthly data to get latest month values per BMU
  const { data: monthlyData, isLoading, error: queryError } = api.aggregatedCatch.monthly.useQuery(
    { bmus: safeBmus },
    {
      retry: 3,
      retryDelay: 1000,
      staleTime: 1000 * 60 * 5,
      enabled: safeBmus.length > 0,
    }
  );

  // Define metrics once with monthly API field mapping
  const metrics = useMemo(() => [
    { id: 'effort', field: 'mean_effort', title: t('text-metrics-effort'), unit: t('text-unit-fishers-km2-day'), category: 'catch' as const },
    { id: 'catch-rate', field: 'mean_cpue', title: t('text-metrics-catch-rate'), unit: t('text-unit-kg-fisher-day'), category: 'catch' as const },
    { id: 'catch-density', field: 'mean_cpua', title: t('text-metrics-catch-density'), unit: t('text-unit-kg-km2-day'), category: 'catch' as const },
    { id: 'fisher-revenue', field: 'mean_rpue', title: t('text-metrics-fisher-revenue'), unit: t('text-unit-kes-fisher-day'), category: 'revenue' as const },
    { id: 'area-revenue', field: 'mean_rpua', title: t('text-metrics-area-revenue'), unit: t('text-unit-kes-km2-day'), category: 'revenue' as const },
    { id: 'costs', field: 'mean_cost', title: t('text-metrics-trip-costs'), unit: t('text-unit-kes-fisher-day'), category: 'revenue' as const },
    { id: 'profit', field: 'mean_profit', title: t('text-metrics-profit'), unit: t('text-unit-kes-fisher-day'), category: 'revenue' as const }
  ] as const, [t]);

  // Process data - use previous month data per BMU
  const processedData = useMemo(() => {
    if (!monthlyData || safeBmus.length === 0) return null;
    
    try {
      // Get current date and calculate previous month
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed
      
      // Calculate previous month date
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      // Group by BMU and find records from previous month
      const previousMonthByBMU: { [key: string]: any } = {};
      
      monthlyData.forEach(record => {
        const recordDate = new Date(record.date);
        const recordYear = recordDate.getFullYear();
        const recordMonth = recordDate.getMonth();
        
        // Check if this record is from the previous month
        if (recordYear === previousYear && recordMonth === previousMonth) {
          const bmu = record.landing_site;
          previousMonthByBMU[bmu] = record;
        }
      });
      
      // If no data from previous month, fall back to latest available
      const dataByBMU = Object.keys(previousMonthByBMU).length > 0 
        ? previousMonthByBMU 
        : (() => {
            const latestByBMU: { [key: string]: any } = {};
            monthlyData.forEach(record => {
              const bmu = record.landing_site;
              if (!latestByBMU[bmu] || new Date(record.date) > new Date(latestByBMU[bmu].date)) {
                latestByBMU[bmu] = record;
              }
            });
            return latestByBMU;
          })();
      
      // Get month name for display
      const latestDate = Object.values(dataByBMU)[0]?.date;
      const monthName = latestDate 
        ? new Date(latestDate).toLocaleString('default', { month: 'long' })
        : '';
      
      return metrics.map(metric => {
        // Collect values for this metric from data per BMU
        const bmuValues: ChartPoint[] = [];
        
        Object.entries(dataByBMU).forEach(([bmu, record], index) => {
          const value = (record as any)[metric.field];
          if (value !== null && value !== undefined) {
            bmuValues.push({
              bmu: bmu,
              value: value,
              index: index
            });
          }
        });
        
        // Sort by value descending and take top 10
        const sortedValues = bmuValues
          .sort((a, b) => (b.value || 0) - (a.value || 0))
          .slice(0, 10);
        
        // Calculate average for display
        const validValues = bmuValues.filter(v => v.value !== null && v.value !== undefined);
        const avgValue = validValues.length > 0
          ? validValues.reduce((sum, v) => sum + (v.value || 0), 0) / validValues.length
          : 0;
        
        // Find user's BMU value
        const userBMUData = bmuValues.find(v => v.bmu === userBMU);
        
        return {
          id: metric.id,
          title: metric.title,
          metric: Math.round(avgValue).toLocaleString(),
          unit: metric.unit,
          chart: sortedValues,
          userBMUValue: userBMUData?.value,
          monthName: monthName
        };
      });
    } catch (error) {
      console.error("Error transforming data:", error);
      return null;
    }
  }, [monthlyData, metrics, safeBmus, userBMU]);

  // Update state based on processed data
  useEffect(() => {
    setLoading(isLoading);
    
    if (queryError) {
      console.error("API error:", queryError);
      setError("Failed to load statistics data");
      setLoading(false);
      return;
    }
    
    if (!isLoading && processedData) {
      setStatsData(processedData);
      setError(null);
      setLoading(false);
    } else if (!isLoading && !processedData && safeBmus.length > 0) {
      setError("No statistics data available");
      setLoading(false);
    }
  }, [processedData, isLoading, queryError, safeBmus.length]);

  // Handlers
  const handleBarClick = useCallback((data: any, metricId: string) => {
    if (!data || !data.activePayload || data.activePayload.length === 0) return;
    
    const entry = data.activePayload[0];
    const bmu = entry.payload.bmu;
    const value = entry.payload.value;
    
    setHoveredBMU(prev => ({
      ...prev,
      [metricId]: { bmu, value }
    }));
  }, []);

  const handleMouseMove = useCallback((state: any, metricId: string) => {
    if (state.activePayload && state.activePayload.length > 0) {
      const entry = state.activePayload[0];
      const bmu = entry.payload.bmu;
      const value = entry.payload.value;
      
      setHoveredBMU(prev => ({
        ...prev,
        [metricId]: { bmu, value }
      }));
    }
  }, []);

  const handleMouseLeave = useCallback((metricId: string) => {
    setHoveredBMU(prev => {
      const newState = { ...prev };
      delete newState[metricId];
      return newState;
    });
  }, []);

  // Custom bar shape that filters out non-DOM props
  const CustomBar = (props: any, metricCategory?: 'catch' | 'revenue') => {
    // Extract only the DOM-safe props that rect elements can accept
    const {
      x,
      y,
      width,
      height,
      payload,
      // Remove all non-DOM props that Recharts might pass
      dataKey,
      index,
      value,
      tooltipPayload,
      onClick,
      onMouseEnter,
      onMouseLeave,
      ...otherProps // This should now be safe for DOM
    } = props;
    
    // Determine fill color based on BMU and metric category
    const isRevenueMetric = metricCategory === 'revenue';
    const baseColor = isRevenueMetric ? "rgba(245, 158, 11, 0.5)" : "rgba(59, 130, 246, 0.5)"; // amber vs blue - more opaque
    const fill = payload?.bmu === userBMU ? "#fc3468" : baseColor;
    
    return (
      <rect 
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
    );
  };

  if (loading) return <LoadingState />;
  if (error) return <div className="min-w-[292px] w-full p-4 text-center text-gray-500">{error}</div>;
  if (!statsData.length) return <div className="min-w-[292px] w-full p-4 text-center text-gray-500">No data available</div>;

  return (
    <>
      {statsData.map((stat) => {
        // Find the metric info to get the category
        const metricInfo = metrics.find(m => m.id === stat.id);
        const isRevenueMetric = metricInfo?.category === 'revenue';
        
        return (
        <MetricCard
          key={stat.id}
          title=""
          metric={<></>}
          rounded="lg"
                      className={cn(
              "@container text-[15px]",
              "min-w-[260px] w-full max-w-full flex-1 p-0 overflow-hidden",
              // Apply color scheme based on category
              isRevenueMetric 
                ? "bg-amber-50/60" 
                : "bg-blue-50/60",
              className
            )}
        >
          <div className="p-4 pb-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-1">
                <Text className="text-m font-medium text-gray-700">{stat.title}</Text>
                <Text className="text-xs text-gray-400">({stat.unit})</Text>
              </div>
              <Text className="text-xs text-gray-500">
                Latest month {stat.monthName ? `(${stat.monthName})` : ''} comparison across BMUs
              </Text>
            </div>
            
            <div className="flex items-baseline justify-between mt-2">
              <div className="flex items-baseline gap-2">
                <Text className="text-l font-bold text-gray-900">
                  {hoveredBMU[stat.id] 
                    ? (hoveredBMU[stat.id].value === null ? "N/A" : Math.round(hoveredBMU[stat.id].value!).toLocaleString())
                    : stat.metric}
                </Text>
                                <span className="text-xs font-bold text-gray-500">
                {hoveredBMU[stat.id] ? hoveredBMU[stat.id].bmu : "Average among all BMUs"}
              </span>
              </div>
              
              {/* {userBMU && stat.userBMUValue !== null && stat.userBMUValue !== undefined && (
                <div className="flex items-center gap-1 text-2xs">
                  <div className="w-2 h-2 rounded-full bg-[#fc3468]" />
                  <span className="text-gray-600">{userBMU}: {Math.round(stat.userBMUValue).toLocaleString()}</span>
                </div>
              )} */}
            </div>
          </div>
          
          <div 
            className="h-32 w-full bg-gray-50/50 transition-colors duration-200 hover:bg-gray-100/60"
            onMouseLeave={() => handleMouseLeave(stat.id)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={stat.chart}
                margin={{ top: 15, right: 8, bottom: 25, left: 30 }}
                barGap={2}
                onMouseMove={(state) => handleMouseMove(state, stat.id)}
                onClick={(data) => handleBarClick(data, stat.id)}
                className="[&_.recharts-cartesian-grid]:hidden"
              >
                <XAxis 
                  dataKey="bmu" 
                  hide={false}
                  tick={{ fontSize: 10, fill: '#666' }}
                  angle={-45}
                  textAnchor="end"
                  height={30}
                  interval={0}
                />
                <YAxis 
                  hide={false}
                  domain={[0, (dataMax: number) => dataMax * 1.1]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                  width={40}
                  tickCount={4}
                  tickFormatter={(value) => {
                    if (value >= 1000) {
                      return `${(value / 1000).toFixed(0)}k`;
                    }
                    return value.toFixed(0);
                  }}
                />
                <Tooltip 
                  content={<></>}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="value"
                  fill="rgba(178, 216, 216, 0.75)"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={8}
                  minPointSize={3}
                  activeBar={{ stroke: '#333', strokeWidth: 1 }}
                  shape={(props: any) => CustomBar(props, metricInfo?.category)}
                  label={{
                    position: 'top',
                    fontSize: 8,
                    fill: '#666',
                    formatter: (value: number) => Math.round(value).toLocaleString()
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </MetricCard>
        );
      })}
    </>
  );
}

export default function FileStatsWBCIA({ className, lang }: FileStatsCIAType) {
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
          <FileStatWBCIAGrid className="min-w-[292px]" lang={lang} />
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