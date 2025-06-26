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
  Cell
} from "recharts";
import { format } from "date-fns";
import { ChartDataPoint, MetricOption, VisibilityState } from "./types";
import { CustomYAxisTick } from "./components";
import { useTranslation } from "@/app/i18n/client";
import React, { useCallback, useEffect, useRef } from "react";
import { BASELINE_DATA } from "./siteConfig";
import { TimeRangeOption } from "@/app/components/filter-selector";

interface ComparisonChartProps {
  chartData: ChartDataPoint[];
  selectedMetricOption?: MetricOption;
  siteColors: Record<string, string>;
  visibilityState: VisibilityState;
  isTablet: boolean;
  isCiaHistoricalMode?: boolean;
  historicalBmuName?: string;
  CustomLegend: (props: any) => React.ReactElement;
  selectedMetric?: string;
  selectedTimeRange?: TimeRangeOption;
}

export default function ComparisonChart({
  chartData,
  selectedMetricOption,
  siteColors,
  visibilityState,
  isTablet,
  isCiaHistoricalMode = false,
  historicalBmuName,
  CustomLegend,
  selectedMetric,
  selectedTimeRange = 'all',
}: ComparisonChartProps) {
  const contextLang = document.documentElement.getAttribute('data-language');
  const isLangReady = document.documentElement.getAttribute('data-language-ready') === 'true';
  const { t, i18n } = useTranslation("common");
  
  // Keep a reference to translation state
  const translationsRef = useRef<Record<string, string>>({});
  
  // Helper function to get time range label for translations
  const getTimeRangeLabel = useCallback((timeRange: TimeRangeOption): string => {
    switch (timeRange) {
      case '3months':
        return t('text-last-3-months') || 'Last 3 months';
      case '6months':
        return t('text-last-6-months') || 'Last 6 months';
      case '1year':
        return t('text-last-year') || 'Last year';
      case 'all':
        return t('text-all-time') || 'All time';
      default:
        return t('text-all-time') || 'All time';
    }
  }, [t]);

  // Pre-load critical translations to avoid flicker
  useEffect(() => {
    if (contextLang) {
      const averageText = t("text-average-of-all-bmus");
      const performanceVsMsy = t("text-performance-vs-msy");
      const ciaMsyExplanation = t("text-cia-msy-comparison-explanation");
      const performanceVsMinWage = t("text-performance-vs-minimum-wage");
      const ciaMinWageExplanation = t("text-cia-minimum-wage-comparison-explanation");
      const timeRangeLabel = getTimeRangeLabel(selectedTimeRange);
      const performanceVsSelected = t("text-performance-vs-selected-average", { timeRange: timeRangeLabel });
      const ciaSelectedExplanation = t("text-cia-selected-time-comparison-explanation", { timeRange: timeRangeLabel });
      
      translationsRef.current = {
        ...translationsRef.current,
        "text-average-of-all-bmus": averageText,
        "text-performance-vs-msy": performanceVsMsy,
        "text-cia-msy-comparison-explanation": ciaMsyExplanation,
        "text-performance-vs-minimum-wage": performanceVsMinWage,
        "text-cia-minimum-wage-comparison-explanation": ciaMinWageExplanation,
        "text-performance-vs-selected-average": performanceVsSelected,
        "text-cia-selected-time-comparison-explanation": ciaSelectedExplanation,
      };
    }
  }, [contextLang, t, selectedTimeRange, getTimeRangeLabel]);
  
  // Sync with the parent language if needed
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

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, selectedMetricOption, selectedMetric }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const formattedDate = formatDate(data.date);
      
      // Sort payload by value in descending order
      const sortedPayload = [...payload].sort((a, b) => {
        const valueA = a.value ?? -Infinity;
        const valueB = b.value ?? -Infinity;
        return valueB - valueA;
      });
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-600 mb-2">{formattedDate}</p>
          <div className="space-y-1.5">
            {sortedPayload.map((entry: any) => (
              <div key={entry.dataKey} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <p className="text-sm">
                  <span className="font-medium">{entry.name}:</span>{" "}
                  <span className="font-semibold">
                    {entry.value !== undefined ? entry.value.toFixed(1) : "N/A"}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Generate bars for each BMU (for non-CIA mode)
  const renderBars = () => {
    const sites = Object.keys(siteColors)
      .filter(site => site !== "average" && site !== "historical_average")
      .filter(site => visibilityState[site]?.opacity !== 0);
    
    if (sites.length === 0) return null;
    
    return sites.flatMap((site) => {
      // Check if we're in baseline comparison mode for WBCIA users
      const isBaselineComparison = isCiaHistoricalMode && (selectedMetric === 'mean_cpua' || selectedMetric === 'mean_rpue');
      
      if (isBaselineComparison) {
        // For baseline comparisons, use regular BMU colors
        // The position above/below zero line indicates positive/negative performance
        return (
          <Bar
            key={`${site}Bar`}
            dataKey={site}
            name={site}
            fill={siteColors[site]}
            stroke={siteColors[site]}
            strokeWidth={1}
            maxBarSize={40}
            radius={[2, 2, 0, 0]}
            hide={false}
            fillOpacity={visibilityState[site]?.opacity}
            isAnimationActive={false}
          />
        );
      }
      
      // Regular bars for non-baseline comparison
      return (
      <Bar
        key={`${site}Bar`}
        dataKey={site}
        name={site}
        fill={siteColors[site]}
        stroke={siteColors[site]}
        strokeWidth={1}
        maxBarSize={40}
        radius={[2, 2, 0, 0]}
        stackId={site}
        hide={false}
        fillOpacity={visibilityState[site]?.opacity}
        isAnimationActive={false}
      />
      );
    });
  };

  // Custom Legend for difference data
  const renderCustomLegend = (props: any) => {
    if (!CustomLegend) return null;
    
    // For CIA historical mode with difference data, we need to customize the legend
    if (isCiaHistoricalMode) {
      // For single BMU comparison (CIA users with 'difference' data)
      if (hasNewDataFormat) {
        // Determine legend labels based on metric
        let aboveLabel = t('text-above-average') || 'Above Average';
        let belowLabel = t('text-below-average') || 'Below Average';
        
        if (selectedMetric === 'mean_cpua') {
          aboveLabel = t('text-above-msy') || 'Above MSY';
          belowLabel = t('text-below-msy') || 'Below MSY';
        } else if (selectedMetric === 'mean_rpue') {
          aboveLabel = t('text-above-minimum-wage') || 'Above Minimum Wage';
          belowLabel = t('text-below-minimum-wage') || 'Below Minimum Wage';
        }
        
      // Override the payload to show both positive and negative values
      const customPayload = [
        {
            value: aboveLabel,
          type: 'rect',
          color: '#16a34a',
            id: 'above-baseline'
        },
        {
            value: belowLabel,
          type: 'rect',
          color: '#ef4444',
            id: 'below-baseline'
        }
      ];
      
      return <CustomLegend {...props} payload={customPayload} />;
      }
      
      // For WBCIA/admin users with multiple BMUs, use default legend to show BMU names
      return <CustomLegend {...props} />;
    }
    
    // Use default legend for other cases
    return <CustomLegend {...props} />;
  };

  if (!chartData.length) return null;

  // Check for data format
  const hasNewDataFormat = chartData.some(point => 'difference' in point);

  // Validate if we have any CIA data to display
  const hasValidCiaData = () => {
    if (!isCiaHistoricalMode) return true;
    
    // For WBCIA users with baseline comparisons
    if (selectedMetric === 'mean_cpua' || selectedMetric === 'mean_rpue') {
      // Check if we have any BMU data (excluding date)
      return chartData.some(point => {
        const keys = Object.keys(point).filter(k => k !== 'date');
        return keys.length > 0 && keys.some(k => point[k] !== undefined);
      });
    }
    
    if (hasNewDataFormat) {
      return chartData.some(point => point.difference !== undefined);
    }
    
    if (historicalBmuName) {
      return chartData.some(point => point[historicalBmuName] !== undefined);
    }
    
    return false;
  };
  
  // Show a message if no data is available for CIA mode
  if (isCiaHistoricalMode && !hasValidCiaData()) {
    return (
      <div className="h-96 w-full pt-9 flex items-center justify-center">
        <p className="text-gray-500">{t('text-no-comparison-data-available') || 'No comparison data available'}</p>
      </div>
    );
  }

  // Log data for debugging
  console.log("Chart Data Format:", hasNewDataFormat ? "New" : "Legacy");
  console.log("Sample Data:", chartData.slice(0, 2));

  // Calculate Y-axis domain with a proper range for negative values
  const calculateYDomain = () => {
    let minValue = 0;
    let maxValue = 0;
    
    if (isCiaHistoricalMode && hasNewDataFormat) {
      // Extract all difference values, which can be positive or negative
      const values = chartData
        .map(item => item.difference)
        .filter(value => value !== undefined) as number[];
      
      if (values.length > 0) {
        minValue = Math.min(0, ...values); // Ensure we include 0
        maxValue = Math.max(0, ...values); // Ensure we include 0
      } else {
        return [-10, 10]; // Default domain if no values
      }
    } else {
      // For non-CIA users or legacy format
      const allValues: number[] = [];
      
      chartData.forEach(item => {
        Object.entries(item).forEach(([key, value]) => {
          if (key !== 'date' && value !== undefined && typeof value === 'number') {
            allValues.push(value);
          }
        });
      });
      
      if (allValues.length > 0) {
        minValue = Math.min(0, ...allValues);
        maxValue = Math.max(0, ...allValues);
      } else {
        return [0, 10]; // Default domain for non-CIA mode
      }
    }
    
    // Add padding for better visualization
    const padding = Math.max(Math.abs(minValue), Math.abs(maxValue)) * 0.2;
    
    return [
      minValue - (minValue < 0 ? padding : 0), 
      maxValue + padding
    ] as [number, number];
  };

  const yDomain = calculateYDomain();

  return (
    <div className="h-96 w-full pt-9">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
          barCategoryGap="30%"
          barSize={20}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false}
            stroke="#e2e8f0" 
            strokeOpacity={0.7}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            axisLine={false}
            tick={{ fontSize: 12 }}
            minTickGap={15}
            padding={{ left: 20, right: 20 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(value) => value.toFixed(1)}
            axisLine={false}
            tick={(props) => <CustomYAxisTick {...props} metric={selectedMetric} />}
            width={80}
            domain={yDomain}
            label={{ 
              value: selectedMetric === "mean_cpue" ? t('text-unit-kg-fisher-day') : 
                     selectedMetric === "mean_cpua" ? t('text-unit-kg-km2-day') : 
                     selectedMetric === "mean_rpue" ? t('text-unit-kes-fisher-day') : 
                     selectedMetric === "mean_rpua" ? t('text-unit-kes-km2-day') : 
                     selectedMetric === "mean_effort" ? t('text-unit-fishers-km2-day') : "",
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: 15, fill: '#666' }
            }}
          />
          <Tooltip
            content={(props) => (
              <CustomTooltip
                {...props}
                selectedMetricOption={selectedMetricOption}
                selectedMetric={selectedMetric}
              />
            )}
            wrapperStyle={{ outline: "none" }}
          />
          
          {/* Zero reference line - critical for negative values visualization */}
          <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
          
          {/* Add baseline reference lines only when NOT showing baseline comparisons */}
          {!isCiaHistoricalMode && selectedMetric === "mean_cpua" && (
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
          
          {!isCiaHistoricalMode && selectedMetric === "mean_rpue" && (
            <>
              <ReferenceLine
                y={BASELINE_DATA.INCOME.POVERTY_LINE}
                stroke="#ef4444"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{ value: "Poverty Line", position: "left", fill: "#ef4444", fontSize: 11 }}
              />
              <ReferenceLine
                y={BASELINE_DATA.INCOME.NATIONAL_MINIMUM_WAGE}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{ value: "Minimum Wage", position: "left", fill: "#f59e0b", fontSize: 11 }}
              />
              <ReferenceLine
                y={BASELINE_DATA.INCOME.LIVING_WAGE}
                stroke="#22c55e"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{ value: "Living Wage", position: "left", fill: "#22c55e", fontSize: 11 }}
              />
            </>
          )}
          
          {!isCiaHistoricalMode && selectedMetric === "mean_rpua" && (
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
          
          {/* Month delimiters - ensure all months are shown */}
          {(() => {
            // Get all dates in sorted order
            const dates = chartData.map(item => item.date).sort((a, b) => a - b);
            if (dates.length === 0) return null;
            
            // Only show every other month's delimiter to avoid overcrowding
            return dates.filter((_, index) => index % 2 === 0).map(date => (
              <ReferenceLine 
                key={`vline-${date}`}
                x={date}
                stroke="#e2e8f0"
                strokeWidth={1}
                strokeOpacity={0.7}
                strokeDasharray="3 3"
              />
            ));
          })()}
          
          {/* CIA mode with difference data */}
          {isCiaHistoricalMode && hasNewDataFormat ? (
            <Bar
              dataKey="difference"
              name={t('text-difference-from-average') || 'Difference from Average'}
              fill="#16a34a" // Default color
              maxBarSize={40}
              radius={4}
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={(entry.difference !== undefined && entry.difference > 0) ? '#16a34a' : '#ef4444'} // Green for positive, red for negative
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          ) : (
            // Regular rendering for non-CIA mode
            renderBars()
          )}
          
          {/* Use custom legend implementation to show both colors */}
          <Legend content={renderCustomLegend} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 