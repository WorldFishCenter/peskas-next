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
import { getBarColor } from "./utils";
import { useTranslation } from "@/app/i18n/client";
import { useCallback, useEffect, useRef } from "react";

interface ComparisonChartProps {
  chartData: ChartDataPoint[];
  selectedMetricOption: MetricOption | undefined;
  siteColors: Record<string, string>;
  visibilityState: VisibilityState;
  isTablet: boolean;
  CustomLegend?: React.ComponentType<any>;
}

export default function ComparisonChart({
  chartData,
  selectedMetricOption,
  siteColors,
  visibilityState,
  isTablet,
  CustomLegend,
}: ComparisonChartProps) {
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
  
  // Format date for X-axis ticks
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return format(date, "MMM yyyy");
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
              .filter((entry: any) => {
                // Extract the base site name without Positive/Negative suffix
                const baseSite = entry.dataKey.replace(/Positive|Negative/, "");
                return visibilityState[baseSite]?.opacity !== 0 && 
                       entry.value !== undefined && 
                       entry.value !== null;
              })
              .sort((a: any, b: any) => {
                return Math.abs(b.value) - Math.abs(a.value);
              })
              .map((entry: any) => {
                // Extract the base site name without Positive/Negative suffix
                const baseSite = entry.dataKey.replace(/Positive|Negative/, "");
                const isPositive = entry.value >= 0;
                const prefix = isPositive ? "+" : "";
                
                return (
                  <div key={entry.dataKey} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <p className="text-sm">
                      <span className="font-medium">{baseSite === "average" ? getTranslation("text-average-of-all-bmus") : baseSite}:</span>{" "}
                      <span className={isPositive ? "text-green-600" : "text-red-600"}>
                        {prefix}{entry.value?.toFixed(1)}
                      </span>
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Generate bars for each BMU
  const renderBars = () => {
    // Filter out "average" and any sites with zero opacity
    const sites = Object.keys(siteColors)
      .filter(site => site !== "average")
      .filter(site => visibilityState[site]?.opacity !== 0);
    
    // If there are no sites with non-zero opacity, the chart will be empty
    if (sites.length === 0) {
      return null;
    }
    
    return sites.flatMap((site) => [
      <Bar
        key={`${site}Positive`}
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

  return (
    <div className="h-96 w-full pt-9">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
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
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
          
          {/* Add vertical delimiters for each month */}
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
          
          {renderBars()}
          
          {CustomLegend && <Legend content={(props) => <CustomLegend {...props} />} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 