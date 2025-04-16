import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { ChartDataPoint, MetricOption, VisibilityState } from "./types";
import { CustomYAxisTick } from "./components";

interface AnnualChartProps {
  chartData: ChartDataPoint[];
  selectedMetricOption: MetricOption | undefined;
  siteColors: Record<string, string>;
  visibilityState: VisibilityState;
  isCiaUser: boolean;
  isTablet: boolean;
  CustomLegend?: React.ComponentType<any>;
}

export default function AnnualChart({
  chartData,
  selectedMetricOption,
  siteColors,
  visibilityState,
  isCiaUser,
  isTablet,
  CustomLegend,
}: AnnualChartProps) {
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

  // Generate bars for each BMU
  const renderBars = () => {
    const sites = Object.keys(siteColors).filter(site => site !== "average");
    
    return sites.map((site) => (
      <Bar
        key={site}
        dataKey={site}
        name={site}
        fill={siteColors[site]}
        stroke={siteColors[site]}
        strokeWidth={1}
        maxBarSize={40}
        radius={[2, 2, 0, 0]}
        hide={visibilityState[site]?.opacity === 0}
        fillOpacity={visibilityState[site]?.opacity}
      />
    ));
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
          
          {renderBars()}
          
          {/* Add average bar for non-CIA users */}
          {!isCiaUser && (
            <Bar
              dataKey="average"
              name="Average"
              fill="#000000"
              stroke="#000000"
              strokeWidth={1}
              maxBarSize={40}
              radius={[2, 2, 0, 0]}
              fillOpacity={visibilityState["average"]?.opacity}
            />
          )}
          
          {CustomLegend && <Legend content={(props) => <CustomLegend {...props} />} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 