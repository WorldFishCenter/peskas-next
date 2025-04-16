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
                      <span className="font-medium">{baseSite}:</span>{" "}
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
    const sites = Object.keys(siteColors).filter(site => site !== "average");
    
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
        hide={visibilityState[site]?.opacity === 0}
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
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tickCount={isTablet ? 3 : 6}
            tickMargin={10}
            axisLine={false}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(value) => value.toFixed(1)}
            axisLine={false}
            tick={<CustomYAxisTick />}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#000" strokeWidth={1} />
          
          {renderBars()}
          
          {CustomLegend && <Legend content={(props) => <CustomLegend {...props} />} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 