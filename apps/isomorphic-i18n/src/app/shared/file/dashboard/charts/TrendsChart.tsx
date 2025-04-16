import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { ChartDataPoint, MetricOption, VisibilityState } from "./types";
import { CustomYAxisTick } from "./components";

interface TrendsChartProps {
  chartData: ChartDataPoint[];
  selectedMetricOption: MetricOption | undefined;
  siteColors: Record<string, string>;
  visibilityState: VisibilityState;
  isCiaUser: boolean;
  isTablet: boolean;
  fiveYearMarks?: number[];
  CustomLegend?: React.ComponentType<any>;
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
}: TrendsChartProps) {
  // Format date for X-axis ticks
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return format(date, "MMM yyyy");
  };

  // Generate areas for each BMU
  const renderAreas = () => {
    const sites = Object.keys(siteColors).filter(site => site !== "average");
    
    return sites.map((site) => (
      <Area
        key={site}
        type="monotone"
        dataKey={site}
        stroke={siteColors[site]}
        fill={siteColors[site]}
        fillOpacity={0.1}
        strokeWidth={2}
        dot={false}
        activeDot={{ r: 6, strokeWidth: 0 }}
        hide={visibilityState[site]?.opacity === 0}
        strokeOpacity={visibilityState[site]?.opacity}
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
                visibilityState[entry.dataKey]?.opacity !== 0 && 
                entry.value !== undefined && 
                entry.value !== null
              )
              .sort((a: any, b: any) => {
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
                    <span className="font-medium">{entry.dataKey}:</span>{" "}
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
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            tick={<CustomYAxisTick />}
            width={40}
          />
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <Tooltip content={<CustomTooltip />} />
          
          {renderAreas()}
          
          {/* Add average line for non-CIA users */}
          {!isCiaUser && (
            <Area
              type="monotone"
              dataKey="average"
              stroke="#000000"
              strokeWidth={4}
              fill="none"
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
              strokeOpacity={visibilityState["average"]?.opacity}
              strokeDasharray="5 5"
            />
          )}
          
          {CustomLegend && <Legend content={(props) => <CustomLegend {...props} />} />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
} 