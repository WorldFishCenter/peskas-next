import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { ChartDataPoint, MetricOption, VisibilityState } from "./types";
import { CustomYAxisTick } from "./components";
import { useTranslation } from "@/app/i18n/client";
import { useCallback, useEffect, useRef, useMemo } from "react";
import { BASELINE_DATA } from "./siteConfig";

interface AnnualChartProps {
  chartData: ChartDataPoint[];
  selectedMetricOption?: MetricOption;
  siteColors: Record<string, string>;
  visibilityState: VisibilityState;
  isCiaUser: boolean;
  isTablet: boolean;
  CustomLegend: (props: any) => React.ReactElement;
  selectedMetric?: string;
  individualFisherData?: any[];
  individualYearlyData?: any[];
  userFisherId?: string;
}

export default function AnnualChart({
  chartData,
  selectedMetricOption,
  siteColors,
  visibilityState,
  isCiaUser,
  isTablet,
  CustomLegend,
  selectedMetric,
  individualFisherData,
  individualYearlyData,
  userFisherId,
}: AnnualChartProps) {
  // Check if there's a parent language context we should use
  const contextLang = document.documentElement.getAttribute('data-language');
  const isLangReady = document.documentElement.getAttribute('data-language-ready') === 'true';
  const { t, i18n } = useTranslation("common");
  
  // Keep a reference to translation state
  const translationsRef = useRef<Record<string, string>>({});
  
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
  
  // Process individual fisher data for overlay  
  const individualFisherChartData = useMemo(() => {
    // Use pre-aggregated yearly data if available (much faster)
    if (individualYearlyData && individualYearlyData.length > 0) {
      return individualYearlyData.map(yearData => ({
        date: new Date(`${yearData.year}-01-01`).getTime(),
        individualFisher: yearData[selectedMetric === "mean_cpue" ? "mean_cpue" : "mean_rpue"] || undefined
      }));
    }
    
    // Fall back to client-side aggregation if no yearly data
    if (!individualFisherData || !userFisherId || individualFisherData.length === 0) return [];
    
    // Early exit for incompatible metrics
    if (selectedMetric !== "mean_cpue" && selectedMetric !== "mean_rpue") {
      return [];
    }
    
    // Convert daily fisher data to yearly aggregates to match BMU data structure
    const yearlyAggregates: Record<string, { 
      sum: number; 
      count: number; 
      date: number;
    }> = {};
    
    // Process in batches for better performance with large datasets
    const batchSize = 100;
    for (let i = 0; i < individualFisherData.length; i += batchSize) {
      const batch = individualFisherData.slice(i, i + batchSize);
      
      batch.forEach(record => {
        const date = new Date(record.date);
        const year = date.getFullYear();
        const yearKey = year.toString();
        
        if (!yearlyAggregates[yearKey]) {
          // Use same date creation logic as BMU annual data (UTC-based)
          const yearTimestamp = new Date(`${year}-01-01`).getTime();
          yearlyAggregates[yearKey] = {
            sum: 0,
            count: 0,
            date: yearTimestamp
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
        }
        // Note: Individual fishers only have CPUE and RPUE data, not area-based metrics or effort
        
        if (value !== null) {
          yearlyAggregates[yearKey].sum += value;
          yearlyAggregates[yearKey].count++;
        }
      });
    }
    
    // Convert to array format matching BMU data structure
    return Object.values(yearlyAggregates)
      .filter(agg => agg.count > 0)
      .map(agg => ({
        date: agg.date,
        individualFisher: agg.sum / agg.count
      }))
      .sort((a, b) => a.date - b.date);
  }, [individualFisherData, individualYearlyData, userFisherId, selectedMetric]);
  
  // Merge BMU data with individual fisher data
  const mergedChartData = useMemo(() => {
    if (!individualFisherChartData.length) return chartData;
    
    // Create a map of individual fisher data by date
    const fisherDataMap = new Map(
      individualFisherChartData.map(item => [item.date, item.individualFisher])
    );
    
    // Merge with BMU data
    const merged = chartData.map(bmuPoint => ({
      ...bmuPoint,
      individualFisher: fisherDataMap.get(bmuPoint.date) || undefined
    }));
    
    return merged;
  }, [chartData, individualFisherChartData]);

  // Format date for X-axis ticks (year only)
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return format(date, "yyyy");
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
                visibilityState[entry.dataKey]?.opacity !== 0 && 
                entry.value !== undefined && 
                entry.value !== null
              )
              .sort((a: any, b: any) => {
                // Always put average at the bottom
                if (a.dataKey === "average") return 1;
                if (b.dataKey === "average") return -1;
                if (a.dataKey === "historical_average") return 1;
                if (b.dataKey === "historical_average") return -1;
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
                      {entry.dataKey === "average" 
                        ? getTranslation("text-average-of-all-bmus") 
                        : entry.dataKey === "historical_average"
                        ? t("text-historical-average") || "Historical Average"
                        : entry.dataKey === "individualFisher"
                        ? t("text-your-performance") || "Your Performance"
                        : entry.dataKey}
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

  // Generate bars for each BMU
  const renderBars = () => {
    // Filter BMUs - always exclude historical_average for all users
    const sites = Object.keys(siteColors).filter(site => 
      site !== "average" && site !== "historical_average"
    );
    
    return sites.map((site) => (
      <Bar
        key={site}
        dataKey={site}
        name={site}
        fill={siteColors[site]}
        stroke={siteColors[site]}
        fillOpacity={(visibilityState[site]?.opacity || 1) * 0.85}
        strokeOpacity={visibilityState[site]?.opacity || 1}
        radius={[4, 4, 0, 0]}
        isAnimationActive={false}
      />
    ));
  };

  return (
    <div className="h-96 w-full pt-9">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={mergedChartData}
          margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
          barGap={2}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={{ stroke: "#cbd5e1" }}
            tickMargin={5}
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
                       selectedMetric === "mean_effort" ? t('text-unit-fishers-km2-day') : 
                       selectedMetricOption?.category === "catch" ? "Avg. catch (kg/fisher/month)" : "",
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: 12, fill: '#666' }
              }}
          />
          <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} />
          
          {renderBars()}
          
          {/* Add individual fisher bar if data is available */}
          {individualFisherData && userFisherId && (
            <Bar
              dataKey="individualFisher"
              name={t("text-your-performance") || "Your Performance"}
              fill="#F79F79"
              stroke="#F79F79"
              fillOpacity={(visibilityState["individualFisher"]?.opacity || 1) * 0.85}
              strokeOpacity={visibilityState["individualFisher"]?.opacity || 1}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          )}
          
          {/* Add average bar for non-CIA users */}
          {!isCiaUser && (
            <Bar
              dataKey="average"
              name={getTranslation("text-average-of-all-bmus")}
              fill="#64748b"
              stroke="#64748b"
              fillOpacity={(visibilityState["average"]?.opacity || 1) * 0.85}
              strokeOpacity={visibilityState["average"]?.opacity || 1}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
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
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 