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
import { getBarColor } from "./utils";
import { useTranslation } from "@/app/i18n/client";
import { useCallback, useEffect, useRef } from "react";
import React from "react";

interface ComparisonChartProps {
  chartData: ChartDataPoint[];
  selectedMetricOption?: MetricOption;
  siteColors: Record<string, string>;
  visibilityState: VisibilityState;
  isTablet: boolean;
  isCiaHistoricalMode?: boolean;
  historicalBmuName?: string;
  CustomLegend: (props: any) => React.ReactElement;
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
}: ComparisonChartProps) {
  const contextLang = document.documentElement.getAttribute('data-language');
  const isLangReady = document.documentElement.getAttribute('data-language-ready') === 'true';
  const { t, i18n } = useTranslation("common");
  
  // Keep a reference to translation state
  const translationsRef = useRef<Record<string, string>>({});
  
  // Pre-load critical translations to avoid flicker
  useEffect(() => {
    if (contextLang) {
      const averageText = t("text-average-of-all-bmus");
      translationsRef.current = {
        ...translationsRef.current,
        "text-average-of-all-bmus": averageText,
      };
    }
  }, [contextLang, t]);
  
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
  const CustomTooltip = ({ active, payload, selectedMetricOption }: any) => {
    if (active && payload && payload.length && payload[0].payload) {
      const data = payload[0].payload;
      const date = new Date(data.date);
      const formattedDate = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
      }).format(date);

      // For CIA historical mode with difference value
      if (isCiaHistoricalMode) {
        const difference = data.difference;
        const historicalAvg = data.historical_average;
        const actualValue = data.actualValue;
        
        return (
          <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
            <p className="text-sm font-medium text-gray-600 mb-2">{formattedDate}</p>
            <div className="space-y-1.5">
              {difference !== undefined && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: difference > 0 ? '#16a34a' : '#ef4444' }}
                  />
                  <p className="text-sm">
                    <span className="font-medium">
                      {difference > 0 ? t('text-above-average') : t('text-below-average')}:
                    </span>{" "}
                    <span className="font-semibold">
                      {Math.abs(difference).toFixed(1)}
                    </span>
                  </p>
                </div>
              )}
              
              {/* Show 6-month average */}
              {historicalAvg !== undefined && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: '#94a3b8' }}
                  />
                  <p className="text-sm">
                    <span className="font-medium">{t('text-6-month-average') || '6-Month Average'}:</span>{" "}
                    <span className="font-semibold">
                      {historicalAvg.toFixed(1)}
                    </span>
                  </p>
                </div>
              )}
              
              {/* Show actual value */}
              {actualValue !== undefined && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: '#3b82f6' }}
                  />
                  <p className="text-sm">
                    <span className="font-medium">{t('text-actual-value') || 'Actual Value'}:</span>{" "}
                    <span className="font-semibold">
                      {actualValue.toFixed(1)}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      }
      
      // Regular tooltip for non-CIA mode
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-600 mb-2">{formattedDate}</p>
          <div className="space-y-1.5">
            {payload.map((entry: any) => (
              <div key={entry.dataKey} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <p className="text-sm">
                  <span className="font-medium">{entry.name}:</span>{" "}
                  <span className="font-semibold">
                    {entry.value ? entry.value.toFixed(1) : "N/A"}
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
    
    return sites.flatMap((site) => [
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
    ]);
  };

  // Custom Legend for difference data
  const renderCustomLegend = (props: any) => {
    if (!CustomLegend) return null;
    
    // For CIA historical mode with difference data, we need to customize the legend
    if (isCiaHistoricalMode) {
      // Override the payload to show both positive and negative values
      const customPayload = [
        {
          value: t('text-above-average') || 'Above Average',
          type: 'rect',
          color: '#16a34a',
          id: 'above-average'
        },
        {
          value: t('text-below-average') || 'Below Average',
          type: 'rect',
          color: '#ef4444',
          id: 'below-average'
        }
      ];
      
      return <CustomLegend {...props} payload={customPayload} />;
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
          barGap={0}
          barCategoryGap={200}
          barSize={30}
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
            tick={<CustomYAxisTick />}
            width={40}
            domain={yDomain}
          />
          <Tooltip
            content={(props) => (
              <CustomTooltip
                {...props}
                selectedMetricOption={selectedMetricOption}
              />
            )}
            wrapperStyle={{ outline: "none" }}
          />
          
          {/* Zero reference line - critical for negative values visualization */}
          <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
          
          {/* Month delimiters */}
          {chartData.map((item) => (
            <ReferenceLine 
              key={`vline-${item.date}`}
              x={item.date}
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeOpacity={0.7}
              strokeDasharray="3 3"
            />
          ))}
          
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