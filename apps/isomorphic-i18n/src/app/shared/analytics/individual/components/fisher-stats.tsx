"use client";

import { Text } from "rizzui";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { useTranslation } from "@/app/i18n/client";
import { useIndividualData } from "../hooks/use-individual-data";
import useUserPermissions from "../../core/hooks/use-user-permissions";
import cn from "@utils/class-names";
import { PiTrendUp, PiTrendDown, PiEquals } from "react-icons/pi";
import { api } from "@/trpc/react";
import { useMemo, useEffect, useState, useCallback } from "react";
import { getClientLanguage } from "@/app/i18n/language-link";
import { BASELINE_DATA } from "../../charts/utils/site-config";
import MetricCard from "@components/cards/metric-card";

interface ChartPoint {
  month: string;
  value: number | null;
  index: number;
  bmuValue?: number | null; // For comparison when permissions allow
}

interface StatData {
  id: string;
  title: string;
  metric: string;
  unit: string;
  chart: ChartPoint[];
  monthName?: string;
  category: 'catch' | 'revenue';
}

export default function IndividualFisherStats({ 
  lang, 
  startDate, 
  endDate 
}: { 
  lang?: string;
  startDate?: Date | null;
  endDate?: Date;
}) {
  // Use client language instead of lang prop
  const clientLang = getClientLanguage();
  const { t, i18n } = useTranslation(clientLang);
  
  // Always use a fixed date range for stats (latest 3 months) - independent of time range filter
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // Always get last 3 months
    return { startDate, endDate };
  }, []);
  
  const { fisherPerformanceSummary, isLoadingFisherSummary, fisherData } = useIndividualData(dateRange);
  
  // Track current language with state
  const [currentLang, setCurrentLang] = useState(clientLang);
  
  // State for chart interactions (similar to CIA file-stats.tsx)
  const [hoveredMonth, setHoveredMonth] = useState<{[key: string]: { month: string; value: number | null }}>({});
  
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
  
  const { userFisherId, isIiaUser, shouldShowIndividualData, canCompareWithOthers, canSeeBMUData } = useUserPermissions();
  
  // Define metrics similar to CIA file-stats.tsx with monthly API field mapping
  const metrics = useMemo(() => [
    { id: 'cpue', field: 'mean_cpue', title: t('text-metrics-catch-rate'), unit: t('text-unit-kg-fisher-day'), category: 'catch' as const },
    { id: 'rpue', field: 'mean_rpue', title: t('text-metrics-fisher-revenue'), unit: t('text-unit-kes-fisher-day'), category: 'revenue' as const },
    { id: 'cost', field: 'mean_cost', title: t('text-costs'), unit: t('text-unit-kes-fisher-day'), category: 'revenue' as const },
    { id: 'profit', field: 'mean_profit', title: t('text-net-profit'), unit: t('text-unit-kes-fisher-day'), category: 'revenue' as const }
  ] as const, [t]);

  // Get fisher's BMU from their data
  const fisherBMU = useMemo(() => {
    if (!fisherData || fisherData.length === 0) return null;
    return fisherData[0]?.BMU;
  }, [fisherData]);

  // Fetch all data for the fisher's BMU to calculate averages - only for users who can compare
  const { data: bmuData, isLoading: isLoadingBmuData } = api.individualData.all.useQuery(
    { bmus: fisherBMU ? [fisherBMU] : [] },
    { enabled: !!fisherBMU && canCompareWithOthers }
  );

  // Process data - get the latest 3 months (similar to CIA file-stats.tsx)
  const processedData = useMemo(() => {
    if (!fisherData || fisherData.length === 0) return null;
    
    try {
      // Sort data by date and get latest 3 months
      const sortedData = fisherData
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 90) // Get more days to ensure we have 3 full months
        .reverse(); // Reverse to show chronological order (oldest to newest)
      
      if (sortedData.length === 0) return null;
      
      // Group by month
      const monthlyGroups: Record<string, any[]> = {};
      sortedData.forEach(record => {
        const date = new Date(record.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleString('default', { month: 'short' });
        
        if (!monthlyGroups[monthKey]) {
          monthlyGroups[monthKey] = [];
        }
        monthlyGroups[monthKey].push({ ...record, monthName });
      });
      
      // Get latest 3 months
      const latestMonths = Object.keys(monthlyGroups)
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 3)
        .reverse();
      
      if (latestMonths.length === 0) return null;
      
      return metrics.map(metric => {
        // Collect values for this metric from the 3 months
        const monthValues: ChartPoint[] = [];
        
        latestMonths.forEach((monthKey, index) => {
          const monthRecords = monthlyGroups[monthKey];
          if (monthRecords && monthRecords.length > 0) {
            // Calculate average for this month
            const validRecords = monthRecords.filter(record => {
              const value = (record as any)[metric.field];
              return value !== null && value !== undefined;
            });
            
            if (validRecords.length > 0) {
              const monthSum = validRecords.reduce((sum, record) => sum + (record as any)[metric.field], 0);
              const monthAvg = monthSum / validRecords.length;
              const monthName = validRecords[0].monthName;
              
              monthValues.push({
                month: monthName,
                value: monthAvg,
                index: index
              });
            }
          }
        });
        
        // Add BMU comparison data for the same months if user can compare
        if (canCompareWithOthers && bmuData) {
          // Group BMU data by month and calculate averages (excluding current fisher)
          const bmuMonthlyGroups: Record<string, any[]> = {};
          bmuData
            .filter(record => record.fisher_id !== userFisherId)
            .forEach(record => {
              const date = new Date(record.date);
              const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              
              if (latestMonths.includes(monthKey)) {
                if (!bmuMonthlyGroups[monthKey]) {
                  bmuMonthlyGroups[monthKey] = [];
                }
                bmuMonthlyGroups[monthKey].push(record);
              }
            });
          
          // Add BMU values to chart points
          monthValues.forEach(monthValue => {
            const correspondingMonthKey = latestMonths[monthValue.index];
            const bmuRecords = bmuMonthlyGroups[correspondingMonthKey] || [];
            
            const validBmuRecords = bmuRecords.filter(record => {
              const value = (record as any)[metric.field];
              return value !== null && value !== undefined;
            });
            
            if (validBmuRecords.length > 0) {
              const bmuSum = validBmuRecords.reduce((sum, record) => sum + (record as any)[metric.field], 0);
              const bmuAvg = bmuSum / validBmuRecords.length;
              monthValue.bmuValue = bmuAvg;
            }
          });
        }
        
        // Get the latest month value for display
        const latestMonth = monthValues.length > 0 ? monthValues[monthValues.length - 1] : null;
        const latestValue = latestMonth?.value || 0;
        const latestMonthName = latestMonth?.month || '';
        
        return {
          id: metric.id,
          title: metric.title,
          metric: Math.round(latestValue).toLocaleString(),
          unit: metric.unit,
          chart: monthValues,
          monthName: t('text-your-performance-last-3-months'),
          category: metric.category
        };
      });
    } catch (error) {
      console.error("Error transforming data:", error);
      return null;
    }
  }, [fisherData, metrics, canCompareWithOthers, bmuData, userFisherId, t]);

  // Chart interaction handlers (similar to CIA file-stats.tsx)
  const handleBarClick = useCallback((data: any, metricId: string) => {
    if (!data || !data.activePayload || data.activePayload.length === 0) return;
    
    const entry = data.activePayload[0];
    const month = entry.payload.month;
    const value = entry.payload.value;
    
    setHoveredMonth(prev => ({
      ...prev,
      [metricId]: { month, value }
    }));
  }, []);

  const handleMouseMove = useCallback((state: any, metricId: string) => {
    if (state.activePayload && state.activePayload.length > 0) {
      const entry = state.activePayload[0];
      const month = entry.payload.month;
      const value = entry.payload.value;
      
      setHoveredMonth(prev => ({
        ...prev,
        [metricId]: { month, value }
      }));
    }
  }, []);

  const handleMouseLeave = useCallback((metricId: string) => {
    setHoveredMonth(prev => {
      const newState = { ...prev };
      delete newState[metricId];
      return newState;
    });
  }, []);

  // Only render for users who should see individual data (IIA users or admin-fishers)
  if (!shouldShowIndividualData || !userFisherId) {
    return null;
  }

  // Loading state (similar to CIA file-stats.tsx)
  if (isLoadingFisherSummary || (canCompareWithOthers && isLoadingBmuData)) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <MetricCard
            key={i}
            title=""
            metric=""
            rounded="lg"
            chart={
              <div className="h-24 w-24 @[16.25rem]:h-28 @[16.25rem]:w-32 @xs:h-32 @xs:w-36 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                  <span className="text-sm text-gray-500">Loading...</span>
                </div>
              </div>
            }
            chartClassName="flex flex-col w-auto h-auto text-center justify-center"
            className="min-w-[292px] w-full max-w-full flex flex-col items-center justify-center"
          />
        ))}
      </div>
    );
  }
  
  if (!processedData) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-[292px] w-full p-4 text-center text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {processedData.map((stat) => {
        // Find the metric info to get the category
        const isRevenueMetric = stat.category === 'revenue';
        
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
                : "bg-blue-50/60"
            )}
          >
            <div className="p-4 pb-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-1">
                  <Text className="text-m font-medium text-gray-700">{stat.title}</Text>
                  <Text className="text-xs text-gray-400">({stat.unit})</Text>
                </div>
                <Text className="text-xs text-gray-500">
                  {stat.monthName}
                </Text>
              </div>
            </div>
            
            {/* Legend for individual data */}
            {canCompareWithOthers && stat.chart.some(point => point.bmuValue !== undefined) && (
              <div className="flex items-center gap-3 text-2xs px-4 pb-2">
                <div className="flex items-center gap-1">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isRevenueMetric ? "bg-amber-500" : "bg-blue-500"
                  )} />
                  <span>{fisherBMU} Avg</span>
                </div>
              </div>
            )}
            
            <div 
              className="h-32 w-full bg-gray-50/50 transition-colors duration-200 hover:bg-gray-100/60"
              onMouseLeave={() => handleMouseLeave(stat.id)}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={stat.chart}
                  margin={{ top: 15, right: 8, bottom: 0, left: 8 }}
                  barGap={2}
                  onMouseMove={(state) => handleMouseMove(state, stat.id)}
                  onClick={(data) => handleBarClick(data, stat.id)}
                  className="[&_.recharts-cartesian-grid]:hidden"
                >
                  <XAxis 
                    dataKey="month" 
                    hide={false}
                    tick={(props) => {
                      const { x, y, payload } = props;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={0}
                            y={0}
                            dy={16}
                            textAnchor="middle"
                            fill="#666"
                            fontSize={10}
                            fontWeight="bold"
                          >
                            {payload.value}
                          </text>
                        </g>
                      );
                    }}
                    textAnchor="middle"
                    height={30}
                    interval={0}
                  />
                  <YAxis 
                    hide={false}
                    domain={[(dataMin: number) => Math.min(0, dataMin), (dataMax: number) => Math.max(0, dataMax)]}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={{ stroke: '#cbd5e1' }}
                    axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                    width={25}
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
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" strokeWidth={1} />
                  {/* Individual Fisher Data Bars */}
                  <Bar
                    dataKey="value"
                    name="You"
                    fill="#F79F79"
                    radius={[2, 2, 0, 0]}
                    maxBarSize={8}
                    minPointSize={0}
                    activeBar={{ stroke: '#e67e22', strokeWidth: 1 }}
                    label={{
                      position: 'top',
                      fontSize: 8,
                      fill: '#666',
                      formatter: (value: number) => Math.round(value).toLocaleString()
                    }}
                  />
                  {/* BMU Average Bars - only if user can compare and data exists */}
                  {canCompareWithOthers && stat.chart.some(point => point.bmuValue !== undefined) && (
                    <Bar
                      dataKey="bmuValue"
                      name={`${fisherBMU} Average`}
                      fill={isRevenueMetric ? "rgba(245, 158, 11, 0.5)" : "rgba(59, 130, 246, 0.5)"}
                      radius={[2, 2, 0, 0]}
                      maxBarSize={8}
                      minPointSize={0}
                      activeBar={{ stroke: '#333', strokeWidth: 1 }}
                      label={{
                        position: 'top',
                        fontSize: 8,
                        fill: '#666',
                        formatter: (value: number) => Math.round(value).toLocaleString()
                      }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </MetricCard>
        );
      })}
    </div>
  );
} 