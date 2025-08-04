import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { ChartDataPoint, MetricOption, VisibilityState } from "../utils/chart-types";
import { CustomYAxisTick } from "../utils/chart-components";
import { useTranslation } from "@/app/i18n/client";
import { useEffect, useRef, useCallback, useMemo } from "react";
import { BASELINE_DATA, isIslandSite } from "../utils/site-config";

interface TrendsChartProps {
  chartData: ChartDataPoint[];
  selectedMetricOption: MetricOption | undefined;
  siteColors: Record<string, string>;
  visibilityState: VisibilityState;
  isCiaUser: boolean;
  isTablet: boolean;
  fiveYearMarks?: number[];
  CustomLegend?: React.ComponentType<any>;
  selectedMetric?: string;
  individualFisherData?: any[];
  userFisherId?: string;
}

export default function TrendsChart({
  chartData,
  selectedMetricOption,
  siteColors,
  visibilityState,
  isCiaUser,
  isTablet,
  fiveYearMarks,
  CustomLegend,
  selectedMetric,
  individualFisherData,
  userFisherId,
}: TrendsChartProps) {
  // Check if there's a parent language context we should use
  const contextLang = document.documentElement.getAttribute('data-language');
  const isLangReady = document.documentElement.getAttribute('data-language-ready') === 'true';
  const { t, i18n } = useTranslation("common");
  
  // Keep a reference to translation state
  const translationsRef = useRef<Record<string, string>>({});
  
  // Use chart data as-is, respecting the global time range filter
  const filteredChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    
    // Just sort by date without additional filtering
    // The time range filtering is handled by the global time range selector
    return [...chartData].sort((a, b) => a.date - b.date);
  }, [chartData]);
  
  // Process individual fisher data for overlay
  const individualFisherChartData = useMemo(() => {
    if (!individualFisherData || !userFisherId || individualFisherData.length === 0) return [];
    
    // Convert daily fisher data to monthly aggregates to match BMU data structure
    const monthlyAggregates: Record<string, { 
      sum: number; 
      count: number; 
      date: number;
    }> = {};
    
    individualFisherData.forEach(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyAggregates[monthKey]) {
        // Use first day of month for consistency with BMU data
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        monthlyAggregates[monthKey] = {
          sum: 0,
          count: 0,
          date: monthStart.getTime()
        };
      }
      
      // Get the appropriate metric value - map BMU metrics to individual fisher metrics
      let value: number | null = null;
      if (selectedMetric === "mean_cpue" && record.mean_cpue != null) {
        // Individual fisher CPUE maps directly to BMU CPUE
        value = record.mean_cpue;
      } else if (selectedMetric === "mean_rpue" && record.mean_rpue != null) {
        // Individual fisher RPUE maps directly to BMU RPUE  
        value = record.mean_rpue;
      } else if (selectedMetric === "mean_cost" && record.mean_cost != null) {
        // Individual fisher costs map directly to BMU costs
        value = record.mean_cost;
      } else if (selectedMetric === "mean_profit" && record.mean_profit != null) {
        // Individual fisher profit maps directly to BMU profit
        value = record.mean_profit;
      } else if (selectedMetric === "mean_cpua" && record.mean_cpue != null) {
        // For BMU catch density, show individual fisher CPUE as approximation
        value = record.mean_cpue;
      } else if (selectedMetric === "mean_rpua" && record.mean_rpue != null) {
        // For BMU area revenue, show individual fisher RPUE as approximation
        value = record.mean_rpue;
      }
      // Note: mean_effort has no individual fisher equivalent, so we skip it
      
      if (value !== null) {
        monthlyAggregates[monthKey].sum += value;
        monthlyAggregates[monthKey].count++;
      }
    });
    
    // Convert to array format matching BMU data structure
    return Object.values(monthlyAggregates)
      .filter(agg => agg.count > 0)
      .map(agg => ({
        date: agg.date,
        individualFisher: agg.sum / agg.count
      }))
      .sort((a, b) => a.date - b.date);
  }, [individualFisherData, userFisherId, selectedMetric]);
  
  // Merge BMU data with individual fisher data
  const mergedChartData = useMemo(() => {
    if (!individualFisherChartData.length) return filteredChartData;
    
    // Create a map of individual fisher data by date
    const fisherDataMap = new Map(
      individualFisherChartData.map(item => [item.date, item.individualFisher])
    );
    
    // Merge with BMU data
    return filteredChartData.map(bmuPoint => ({
      ...bmuPoint,
      individualFisher: fisherDataMap.get(bmuPoint.date) || undefined
    }));
  }, [filteredChartData, individualFisherChartData]);
  
  // Pre-load critical translations to avoid flicker
  useEffect(() => {
    // Cache the most commonly used translations
    if (contextLang) {
      const averageText = t("text-average-of-all-bmus");
      translationsRef.current = {
        ...translationsRef.current,
        "text-average-of-all-bmus": averageText,
      };
    }
  }, [contextLang, t]);
  
  // Sync with the parent language if needed - higher priority
  useEffect(() => {
    if (contextLang && isLangReady && i18n.language !== contextLang) {
      i18n.changeLanguage(contextLang);
    }
  }, [contextLang, i18n, isLangReady]);
  
  // Helper to get cached translation or fall back to t function
  const getTranslation = useCallback((key: string) => {
    return translationsRef.current[key] || t(key);
  }, [t]);
  
  // Format date for X-axis ticks
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return format(date, "MMM yyyy");
  };

  // Generate lines for each BMU
  const renderAreas = () => {
    // For CIA users, only show their BMU and not "average" or "historical_average"
    const sites = Object.keys(siteColors).filter(site => {
      if (isCiaUser) {
        return site !== "average" && site !== "historical_average";
      }
      return site !== "average";
    });
    
    return sites.map((site) => (
      <Line
        key={site}
        dataKey={site}
        stroke={siteColors[site]}
        strokeWidth={2}
        dot={{ fill: siteColors[site], strokeWidth: 0, r: 3 }}
        activeDot={{ r: 6, strokeWidth: 0 }}
        hide={visibilityState[site]?.opacity === 0}
        strokeOpacity={visibilityState[site]?.opacity}
        isAnimationActive={false}
        connectNulls={false}
      />
    ));
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-600 mb-2">
            {formatDate(label)}
          </p>
          <div className="space-y-1.5">
            {payload
              .filter((entry: any) => 
                (entry.dataKey === "individualFisher" || visibilityState[entry.dataKey]?.opacity !== 0) && 
                entry.value !== undefined && 
                entry.value !== null
              )
              .sort((a: any, b: any) => {
                // Put individual fisher data at the top
                if (a.dataKey === "individualFisher") return -1;
                if (b.dataKey === "individualFisher") return 1;
                // Always put average at the bottom
                if (a.dataKey === "average") return 1;
                if (b.dataKey === "average") return -1;
                return b.value - a.value;
              })
              .map((entry: any) => (
                <div key={entry.dataKey} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <p className="text-sm">
                    <span className="font-medium">
                      {entry.dataKey === "average" ? getTranslation("text-average-of-all-bmus") : 
                       entry.dataKey === "individualFisher" ? (t("text-your-performance") || "Your Performance") :
                       entry.dataKey}:
                    </span>{" "}
                    {entry.value?.toFixed(1)}
                  </p>
                </div>
              ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-96 w-full pt-9">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={mergedChartData}
          margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
        >
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tickCount={isTablet ? 6 : 12}
            tickMargin={10}
            minTickGap={5}
            axisLine={false}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(value) => value.toFixed(1)}
            axisLine={false}
            tick={(props) => <CustomYAxisTick {...props} metric={selectedMetric} />}
            width={80}
            label={{ 
              value: selectedMetric === "mean_cpue" ? t('text-unit-kg-fisher-day') : 
                     selectedMetric === "mean_cpua" ? t('text-unit-kg-km2-day') : 
                     selectedMetric === "mean_rpue" ? t('text-unit-kes-fisher-day') : 
                     selectedMetric === "mean_rpua" ? t('text-unit-kes-km2-day') : 
                     selectedMetric === "mean_cost" ? t('text-unit-kes-fisher-day') : 
                     selectedMetric === "mean_profit" ? t('text-unit-kes-fisher-day') : 
                     selectedMetric === "mean_effort" ? t('text-unit-fishers-km2-day') : 
                     selectedMetricOption?.category === "catch" ? "Avg. catch (kg/fisher/month)" : "",
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: 12, fill: '#666' }
            }}
          />
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Add vertical reference lines at the beginning of each year */}
          {mergedChartData
            .reduce((yearMarkers, item) => {
              const year = new Date(item.date).getFullYear();
              // Check if we already have a marker for this year
              if (!yearMarkers.some(marker => new Date(marker.date).getFullYear() === year)) {
                yearMarkers.push(item);
              }
              return yearMarkers;
            }, [] as ChartDataPoint[])
            .map((yearStart) => (
              <ReferenceLine
                key={`year-${yearStart.date}`}
                x={yearStart.date}
                stroke="#94a3b8"
                strokeWidth={1}
                strokeOpacity={0.7}
                strokeDasharray="3 3"
              />
            ))
          }
          
          {renderAreas()}
          
          {/* Add individual fisher line if data is available */}
          {individualFisherData && userFisherId && (
            <Line
              dataKey="individualFisher"
              stroke="#F79F79"
              strokeWidth={3}
              strokeOpacity={visibilityState["individualFisher"]?.opacity || 1}
              dot={{ 
                fill: "#F79F79", 
                strokeWidth: 0, 
                r: 4,
                fillOpacity: visibilityState["individualFisher"]?.opacity || 1
              }}
              activeDot={{ r: 7, strokeWidth: 0 }}
              name={t("text-your-performance") || "Your Performance"}
              isAnimationActive={false}
              connectNulls={false}
            />
          )}
          
          {/* Add average line for non-CIA users only */}
          {!isCiaUser && (
            <Line
              dataKey="average"
              stroke="#000000"
              strokeWidth={4}
              dot={{ fill: "#000000", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              strokeOpacity={visibilityState["average"]?.opacity}
              strokeDasharray="5 5"
              name={getTranslation("text-average-of-all-bmus")}
              isAnimationActive={false}
              connectNulls={false}
            />
          )}
          
          {/* Add MSY baseline reference lines for CPUA and Revenue metrics */}
          {selectedMetric === "mean_cpua" && (
            <>
              <ReferenceLine
                y={BASELINE_DATA.CPUA.MSY.FRINGING}
                stroke="#22c55e"
                strokeDasharray="8 4"
                strokeWidth={2}
                label={{ value: "MSY Fringing", position: "left", fill: "#22c55e", fontSize: 11 }}
              />
              <ReferenceLine
                y={BASELINE_DATA.CPUA.MSY.ISLAND}
                stroke="#16a34a"
                strokeDasharray="8 4"
                strokeWidth={2}
                label={{ value: "MSY Island", position: "left", fill: "#16a34a", fontSize: 11 }}
              />
              <ReferenceLine
                y={BASELINE_DATA.CPUA.CURRENT.FRINGING}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: "Current Fringing", position: "left", fill: "#f59e0b", fontSize: 11 }}
              />
              <ReferenceLine
                y={BASELINE_DATA.CPUA.CURRENT.ISLAND}
                stroke="#ea580c"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: "Current Island", position: "left", fill: "#ea580c", fontSize: 11 }}
              />
            </>
          )}
          
          {selectedMetric === "mean_rpue" && (
            <>
              <ReferenceLine
                y={BASELINE_DATA.INCOME.POVERTY_LINE}
                stroke="#ef4444"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{ value: t("text-poverty-line"), position: "left", fill: "#ef4444", fontSize: 11 }}
              />
              <ReferenceLine
                y={BASELINE_DATA.INCOME.NATIONAL_MINIMUM_WAGE}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{ value: t("text-minimum-wage"), position: "left", fill: "#f59e0b", fontSize: 11 }}
              />
              <ReferenceLine
                y={BASELINE_DATA.INCOME.LIVING_WAGE}
                stroke="#22c55e"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{ value: t("text-living-wage"), position: "left", fill: "#22c55e", fontSize: 11 }}
              />
            </>
          )}
          
          {selectedMetric === "mean_rpua" && (
            <>
              <ReferenceLine
                y={BASELINE_DATA.REVENUE_PER_AREA.MSY.FRINGING}
                stroke="#22c55e"
                strokeDasharray="8 4"
                strokeWidth={2}
                label={{ value: "MSY Fringing", position: "left", fill: "#22c55e", fontSize: 11 }}
              />
              <ReferenceLine
                y={BASELINE_DATA.REVENUE_PER_AREA.MSY.ISLAND}
                stroke="#16a34a"
                strokeDasharray="8 4"
                strokeWidth={2}
                label={{ value: "MSY Island", position: "left", fill: "#16a34a", fontSize: 11 }}
              />
              <ReferenceLine
                y={BASELINE_DATA.REVENUE_PER_AREA.CURRENT.FRINGING}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: "Current Fringing", position: "left", fill: "#f59e0b", fontSize: 11 }}
              />
              <ReferenceLine
                y={BASELINE_DATA.REVENUE_PER_AREA.CURRENT.ISLAND}
                stroke="#ea580c"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: "Current Island", position: "left", fill: "#ea580c", fontSize: 11 }}
              />
            </>
          )}
          
          {CustomLegend && <Legend content={(props) => <CustomLegend {...props} />} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 