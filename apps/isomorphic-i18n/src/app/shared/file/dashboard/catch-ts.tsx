import React, { useEffect, useState } from "react";
import WidgetCard from "@components/cards/widget-card";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import SimpleBar from "@ui/simplebar";
import { useMedia } from "@hooks/use-media";
import { useTranslation } from "@/app/i18n/client";
import { api } from "@/trpc/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/select";

type MetricKey = "mean_trip_catch" | "mean_effort" | "mean_cpue" | "mean_cpua";

interface ChartDataPoint {
  date: number;
  value: number;
}

interface ApiDataPoint {
  date: string;
  mean_trip_catch: number;
  mean_effort: number;
  mean_cpue: number;
  mean_cpua: number;
}

interface MetricOption {
  value: MetricKey;
  label: string;
  unit: string;
}

interface CatchMetricsChartProps {
  className?: string;
  lang?: string;
  selectedMetric: MetricKey;
  onMetricChange: (metric: MetricKey) => void;
}

const METRIC_OPTIONS: MetricOption[] = [
  { value: "mean_trip_catch", label: "Mean Catch per Trip", unit: "kg" },
  { value: "mean_effort", label: "Mean Effort", unit: "hours" },
  { value: "mean_cpue", label: "Mean CPUE", unit: "kg/hour" },
  { value: "mean_cpua", label: "Mean CPUA", unit: "kg/area" },
];

const CustomTooltip = ({ active, payload, label, selectedMetric }: any) => {
  if (active && payload?.[0]) {
    const date = new Date(label);
    const metric = METRIC_OPTIONS.find((m) => m.value === selectedMetric);

    return (
      <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
        <p className="text-sm font-medium text-gray-600 mb-2">
          {date.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#0c526e]" />
          <p className="text-sm">
            <span className="font-medium">{metric?.label}:</span>{" "}
            {payload[0].value.toFixed(1)} {metric?.unit}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

function CustomYAxisTick({ x, y, payload }: any) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        className="text-xs fill-gray-500"
      >
        {payload.value.toFixed(1)}
      </text>
    </g>
  );
}

export default function CatchMetricsChart({
  className,
  lang,
  selectedMetric,
  onMetricChange,
}: CatchMetricsChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [fiveYearMarks, setFiveYearMarks] = useState<number[]>([]);
  const isTablet = useMedia("(max-width: 800px)", false);
  const { t } = useTranslation(lang!, "common");

  const handleValueChange = (value: MetricKey) => {
    onMetricChange(value);
  };

  const { data: monthlyData } = api.aggregatedCatch.monthly.useQuery();

  useEffect(() => {
    if (!monthlyData) return;

    try {
      const processedData = monthlyData.map((item: ApiDataPoint) => ({
        date: new Date(item.date).getTime(),
        value: item[selectedMetric],
      }));

      // Find 5-year interval marks
      const allYears = processedData.map((item: ChartDataPoint) =>
        new Date(item.date).getFullYear()
      );
      const minYear = Math.min(...allYears);
      const maxYear = Math.max(...allYears);
      const startYear = Math.floor(minYear / 5) * 5;
      const marks: number[] = [];

      for (let year = startYear; year <= maxYear; year += 5) {
        marks.push(new Date(`${year}-01-01`).getTime());
      }

      setFiveYearMarks(marks);
      setChartData(processedData);
    } catch (error) {
      console.error("Error processing data:", error);
    } finally {
      setLoading(false);
    }
  }, [monthlyData, selectedMetric]);

  if (loading) return <div>Loading chart...</div>;
  if (!chartData || chartData.length === 0) return <div>No data available.</div>;

  const selectedMetricOption = METRIC_OPTIONS.find(
    (m) => m.value === selectedMetric
  );

  return (
    <WidgetCard
      title={
        <div className="flex items-center justify-between w-full">
          <span>{selectedMetricOption?.label}</span>
          <Select value={selectedMetric} onValueChange={handleValueChange}>
            <SelectTrigger
              className="w-48"
              onMouseEnter={(e) => {
                const event = new MouseEvent("click", {
                  view: window,
                  bubbles: true,
                  cancelable: true,
                });
                e.currentTarget.dispatchEvent(event);
              }}
            >
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent
              onMouseLeave={(e) => {
                const trigger = document.querySelector('[data-state="open"]');
                if (trigger) {
                  const event = new MouseEvent("click", {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                  });
                  trigger.dispatchEvent(event);
                }
              }}
            >
              {METRIC_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
      className={className}
    >
      <SimpleBar>
        <div className="h-96 w-full pt-9">
          <ResponsiveContainer
            width="100%"
            height="100%"
            {...(isTablet && { minWidth: "700px" })}
          >
            <AreaChart
              data={chartData}
              margin={{
                left: 16,
                right: 16,
                bottom: 20,
              }}
              className="[&_.recharts-cartesian-axis-tick-value]:fill-gray-500 [&_.recharts-cartesian-axis.yAxis]:-translate-y-3 rtl:[&_.recharts-cartesian-axis.yAxis]:-translate-x-12 [&_.recharts-cartesian-grid-vertical]:opacity-0"
            >
              <defs>
                <linearGradient
                  id="metric_gradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#0c526e" stopOpacity={0.75} />
                  <stop offset="95%" stopColor="#0c526e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="8 10" strokeOpacity={0.435} />
              <XAxis
                dataKey="date"
                scale="time"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(unixTime) => {
                  if (fiveYearMarks.includes(unixTime)) {
                    return new Date(unixTime).getFullYear().toString();
                  }
                  return "";
                }}
                ticks={fiveYearMarks}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={<CustomYAxisTick />}
                width={45}
              />
              <Tooltip
                content={(props) => (
                  <CustomTooltip {...props} selectedMetric={selectedMetric} />
                )}
              />
              {fiveYearMarks.map((date) => (
                <ReferenceLine
                  key={date}
                  x={date}
                  stroke="#718096"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
              ))}
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0c526e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#metric_gradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SimpleBar>
    </WidgetCard>
  );
}