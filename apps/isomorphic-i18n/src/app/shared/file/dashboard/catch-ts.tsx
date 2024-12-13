import WidgetCard from "@components/cards/widget-card";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { bmusAtom } from "@/app/components/filter-selector";
import { useTranslation } from "@/app/i18n/client";
import { api } from "@/trpc/react";
import { useMedia } from "@hooks/use-media";
import SimpleBar from "@ui/simplebar";
import cn from "@utils/class-names";
import { ActionIcon, Popover } from "rizzui";

type MetricKey = "mean_trip_catch" | "mean_effort" | "mean_cpue" | "mean_cpua";

interface ChartDataPoint {
  date: number;
  [key: string]: number | undefined;
}

interface ApiDataPoint {
  date: string;
  landing_site: string;
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

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name?: string;
    dataKey: string | number;
    color: string;
  }>;
  label?: string | number;
  separator?: string;
  selectedMetric: MetricKey;
  selectedMetricOption: MetricOption | undefined;
}

interface VisibilityState {
  [key: string]: {
    opacity: number;
  };
}

type TickProps = {
  x?: number;
  y?: number;
  payload?: {
    value: number;
  };
};

const METRIC_OPTIONS: MetricOption[] = [
  { value: "mean_trip_catch", label: "Mean Catch per Trip", unit: "kg" },
  { value: "mean_effort", label: "Mean Effort", unit: "hours" },
  { value: "mean_cpue", label: "Mean CPUE", unit: "kg/hour" },
  { value: "mean_cpua", label: "Mean CPUA", unit: "kg/area" },
];

// Generate colors dynamically based on index
const generateColor = (index: number): string => {
  const colors = [
    "#0c526e", // Dark blue
    "#fc3468", // Pink
    "#f09609", // Orange
    "#2563eb", // Blue
    "#16a34a", // Green
    "#9333ea", // Purple
    "#ea580c", // Dark orange
    "#0891b2", // Cyan
  ];
  return colors[index % colors.length];
};

const MetricSelector = ({
  selectedMetric,
  onMetricChange,
  selectedMetricOption,
}: {
  selectedMetric: MetricKey;
  onMetricChange: (metric: MetricKey) => void;
  selectedMetricOption: MetricOption | undefined;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Select metric:</span>
      <Popover isOpen={isOpen} setIsOpen={setIsOpen} placement="bottom-end">
        <Popover.Trigger>
          <ActionIcon
            variant="text"
            className="relative h-auto w-auto p-0 flex items-center gap-2"
          >
            <span className="text-sm font-medium text-gray-900">
              {selectedMetricOption?.label}
            </span>
            <svg
              className="h-4 w-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </ActionIcon>
        </Popover.Trigger>
        <Popover.Content className="w-[200px] p-1">
          <div className="space-y-0.5">
            {METRIC_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onMetricChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm transition duration-200 rounded-md",
                  selectedMetric === option.value
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover>
    </div>
  );
};

const CustomTooltip = ({
  active,
  payload,
  label,
  selectedMetric,
  selectedMetricOption,
}: TooltipProps) => {
  if (active && payload?.length) {
    const date = new Date(label as number);

    return (
      <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
        <p className="text-sm font-medium text-gray-600 mb-2">
          {date.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </p>
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <p className="text-sm">
              <span className="font-medium">
                {entry.name || entry.dataKey}:
              </span>{" "}
              {entry.value?.toFixed(1) ?? "N/A"} {selectedMetricOption?.unit}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function CustomYAxisTick({ x = 0, y = 0, payload = { value: 0 } }: TickProps) {
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
  const [visibilityState, setVisibilityState] = useState<VisibilityState>({});
  const [siteColors, setSiteColors] = useState<Record<string, string>>({});

  const isTablet = useMedia("(max-width: 800px)", false);
  const { t } = useTranslation(lang!, "common");
  const [bmus] = useAtom(bmusAtom);

  const { data: monthlyData } = api.aggregatedCatch.monthly.useQuery({ bmus });

  const handleLegendClick = (site: string) => {
    setVisibilityState((prev) => ({
      ...prev,
      [site]: {
        opacity: prev[site]?.opacity === 1 ? 0.2 : 1,
      },
    }));
  };

  useEffect(() => {
    if (!monthlyData) return;

    try {
      // Get unique landing sites from the data
      const uniqueSites = Array.from(
        new Set(monthlyData.map((item: ApiDataPoint) => item.landing_site))
      );

      // Generate colors for each site
      const newSiteColors = uniqueSites.reduce(
        (acc, site, index) => ({
          ...acc,
          [site]: generateColor(index),
        }),
        {}
      );
      setSiteColors(newSiteColors);

      // Initialize visibility state for all sites
      setVisibilityState(
        uniqueSites.reduce(
          (acc, site) => ({
            ...acc,
            [site]: { opacity: 1 },
          }),
          {}
        )
      );

      // Group data by date
      const groupedData = monthlyData.reduce<Record<string, ChartDataPoint>>(
        (acc, item: ApiDataPoint) => {
          const date = new Date(item.date).getTime();
          if (!acc[date]) {
            acc[date] = {
              date,
              ...uniqueSites.reduce((sites, site) => ({ ...sites, [site]: undefined }), {}),
            };
          }
          acc[date][item.landing_site] = item[selectedMetric];
          return acc;
        },
        {}
      );

      const processedData = Object.values(groupedData).sort(
        (a, b) => a.date - b.date
      );

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

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-4 justify-center mt-2">
        {payload?.map((entry: any) => (
          <div
            key={entry.value}
            className="flex items-center gap-2 cursor-pointer select-none transition-all duration-200"
            onClick={() => handleLegendClick(entry.value)}
            style={{ opacity: visibilityState[entry.value]?.opacity }}
          >
            <div
              className="w-3 h-3 rounded-full transition-all duration-200"
              style={{
                backgroundColor: entry.color,
              }}
            />
            <span className="text-sm font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div>Loading chart...</div>;
  if (!chartData || chartData.length === 0) return <div>No data available.</div>;

  const selectedMetricOption = METRIC_OPTIONS.find(
    (m) => m.value === selectedMetric
  );

  return (
    <WidgetCard
      title={
        <div className="flex items-center justify-between w-full">
          <MetricSelector
            selectedMetric={selectedMetric}
            onMetricChange={onMetricChange}
            selectedMetricOption={selectedMetricOption}
          />
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
                {Object.entries(siteColors).map(([site, color]) => (
                  <linearGradient
                    key={site}
                    id={`${site}_gradient`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={color} stopOpacity={0.75} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
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
                tick={CustomYAxisTick}
                width={45}
              />
              <Tooltip
                content={(props: any) => (
                  <CustomTooltip
                    {...props}
                    selectedMetric={selectedMetric}
                    selectedMetricOption={selectedMetricOption}
                  />
                )}
              />
              <Legend content={CustomLegend} />
              {Object.entries(siteColors).map(([site, color]) => (
                <Area
                  key={site}
                  type="monotone"
                  dataKey={site}
                  name={site}
                  stroke={color}
                  strokeWidth={2}
                  fillOpacity={visibilityState[site]?.opacity ?? 1}
                  strokeOpacity={visibilityState[site]?.opacity ?? 1}
                  fill={`url(#${site}_gradient)`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SimpleBar>
    </WidgetCard>
  );
}