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
  Line,
  ReferenceLine,
  BarChart,
  Bar,
} from "recharts";

import { bmusAtom } from "@/app/components/filter-selector";
import { useTranslation } from "@/app/i18n/client";
import { api } from "@/trpc/react";
import { useMedia } from "@hooks/use-media";
import SimpleBar from "@ui/simplebar";
import cn from "@utils/class-names";
import { ActionIcon, Popover } from "rizzui";
import { useSession } from "next-auth/react";


type MetricKey = "mean_effort" | "mean_cpue" | "mean_cpua" | "mean_rpue" | "mean_rpua";

interface ChartDataPoint {
  date: number;
  [key: string]: number | undefined;
}

interface ApiDataPoint {
  date: string;
  landing_site: string;
  mean_effort: number;
  mean_cpue: number;
  mean_cpua: number;
  mean_rpue: number;
  mean_rpua: number;
}

interface MetricOption {
  value: MetricKey;
  label: string;
  unit: string;
  category: "catch" | "revenue";
}

interface CatchMetricsChartProps {
  className?: string;
  lang?: string;
  selectedMetric: MetricKey;
  onMetricChange: (metric: MetricKey) => void;
  bmu?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
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
  {
    value: "mean_effort",
    label: "Effort",
    unit: "fishers/km²/day",
    category: "catch",
  },
  {
    value: "mean_cpue",
    label: "Catch Rate",
    unit: "kg/fisher/day",
    category: "catch",
  },
  {
    value: "mean_cpua",
    label: "Catch Density",
    unit: "kg/km²/day",
    category: "catch",
  },
  {
    value: "mean_rpue",
    label: "Fisher Revenue",
    unit: "KES/fisher/day",
    category: "revenue",
  },
  {
    value: "mean_rpua",
    label: "Area Revenue",
    unit: "KES/km²/day",
    category: "revenue",
  },
];

const generateColor = (index: number, site: string, referenceBmu: string | undefined): string => {
  if (site === referenceBmu) {
    return "#fc3468"; // Red color for reference BMU
  }
  const colors = [
    "#0c526e", // Dark blue
    "#f09609", // Orange
    "#2563eb", // Blue
    "#16a34a", // Green
    "#9333ea", // Purple
    "#ea580c", // Dark orange
    "#0891b2", // Teal
  ];
  return colors[index % colors.length];
};

const LoadingState = () => {
  return (
    <WidgetCard title="Catch Metrics">
      <div className="h-96 w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading chart...</span>
        </div>
      </div>
    </WidgetCard>
  );
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
  const { t } = useTranslation("common");

  const groupedMetrics = {
    catch: METRIC_OPTIONS.filter((m) => m.category === "catch"),
    revenue: METRIC_OPTIONS.filter((m) => m.category === "revenue"),
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Popover isOpen={isOpen} setIsOpen={setIsOpen} placement="bottom-end">
          <Popover.Trigger>
            <ActionIcon
              variant="text"
              className={cn(
                "relative min-w-[180px] h-auto px-4 py-2 rounded-full flex items-center justify-between",
                selectedMetric === "mean_rpue" || selectedMetric === "mean_rpua"
                  ? "bg-amber-50 text-amber-900"
                  : "bg-blue-50 text-blue-900"
              )}
            >
              <span className="text-sm font-medium">
                {selectedMetricOption?.label}
              </span>
              <svg
                className="h-4 w-4 ml-2"
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
          </Popover.Trigger>{" "}
          <Popover.Content
            className="w-[280px] p-2 bg-white/75 backdrop-blur-sm"
          >
            <div className="grid grid-cols-1 gap-2">
              {/* Catch Metrics Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-semibold text-gray-900">
                    {t("text-metrics-catch")}
                  </span>
                </div>
                <div className="space-y-1 pl-4">
                  {groupedMetrics.catch.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onMetricChange(option.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm transition duration-200 rounded-md flex items-center justify-between",
                        selectedMetric === option.value
                          ? "bg-blue-50/90 text-blue-900"
                          : "text-gray-600 hover:bg-gray-50/90"
                      )}
                    >
                      <span>{t(`text-metrics-${option.label.toLowerCase().replace(/ /g, "-")}`)}</span>
                      <span className="text-xs text-gray-500">
                        {option.unit}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 my-2" />

              {/* Revenue Metrics Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-semibold text-gray-900">
                    {t("text-metrics-revenue")}
                  </span>
                </div>
                <div className="space-y-1 pl-4">
                  {groupedMetrics.revenue.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onMetricChange(option.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm transition duration-200 rounded-md flex items-center justify-between",
                        selectedMetric === option.value
                          ? "bg-amber-50 text-amber-900"
                          : "text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      <span>{t(`text-metrics-${option.label.toLowerCase().replace(/ /g, "-")}`)}</span>
                      <span className="text-xs text-gray-500">
                        {option.unit}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Popover.Content>
        </Popover>
      </div>
    </div>
  );
};

const CustomTooltip = ({
  active,
  payload,
  label,
  selectedMetric,
}: TooltipProps) => {
  // Removed selectedMetricOption from props
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
              {entry.value?.toFixed(1) ?? "N/A"} {/* Removed the unit here */}
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

const calculateTrendline = (data: { date: number; difference: number }[]) => {
  if (data.length === 0) return { slope: 0, intercept: 0 };

  // Calculate means
  const meanX = data.reduce((sum, point) => sum + point.date, 0) / data.length;
  const meanY = data.reduce((sum, point) => sum + point.difference, 0) / data.length;

  // Calculate slope using covariance and variance
  const numerator = data.reduce((sum, point) => {
    return sum + (point.date - meanX) * (point.difference - meanY);
  }, 0);

  const denominator = data.reduce((sum, point) => {
    return sum + Math.pow(point.date - meanX, 2);
  }, 0);

  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;

  // Calculate monthly slope for display
  const msPerMonth = 30 * 24 * 60 * 60 * 1000;
  const monthlySlope = slope * msPerMonth;

  return { 
    slope,           // For the visualization
    intercept,       // For the visualization
    displaySlope: monthlySlope  // For display purposes
  };
};

export default function CatchMetricsChart({
  className,
  lang,
  selectedMetric,
  onMetricChange,
  bmu,
  activeTab = 'standard',
  onTabChange,
}: CatchMetricsChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [fiveYearMarks, setFiveYearMarks] = useState<number[]>([]);
  const [visibilityState, setVisibilityState] = useState<VisibilityState>({});
  const [siteColors, setSiteColors] = useState<Record<string, string>>({});
  const [localActiveTab, setLocalActiveTab] = useState(activeTab);

  const isTablet = useMedia("(max-width: 800px)", false);
  const { t } = useTranslation("common");
  const [bmus] = useAtom(bmusAtom);
  const { data: session } = useSession();

  // Determine if the user is part of the CIA group
  const isCiaUser = session?.user?.groups?.some((group: { name: string }) => group.name === 'CIA');

  const { data: monthlyData } = api.aggregatedCatch.monthly.useQuery({ bmus });

  const handleLegendClick = (site: string) => {
    setVisibilityState((prev) => ({
      ...prev,
      [site]: {
        opacity: prev[site]?.opacity === 1 ? 0.2 : 1,
      },
    }));
  };

  const handleTabChange = (tab: string) => {
    setLocalActiveTab(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    if (!monthlyData) return;

    try {
      const uniqueSites = Array.from(
        new Set(monthlyData.map((item: ApiDataPoint) => item.landing_site))
      );

      const newSiteColors = uniqueSites.reduce<Record<string, string>>(
        (acc, site, index) => ({
          ...acc,
          [site as string]: generateColor(index, site, bmu),
        }),
        {}
      );
      setSiteColors(newSiteColors);

      // Set visibility state based on user's BMU
      setVisibilityState(
        uniqueSites.reduce<VisibilityState>(
          (acc, site) => ({
            ...acc,
            [site as string]: { opacity: site === bmu ? 1 : 0.2 },
          }),
          {}
        )
      );

      const groupedData = monthlyData.reduce<Record<string, ChartDataPoint>>(
        (acc, item: ApiDataPoint) => {
          const date = new Date(item.date).getTime();
          if (!acc[date]) {
            acc[date] = {
              date,
              ...uniqueSites.reduce(
                (sites, site) => ({ ...sites, [site]: undefined }),
                {}
              ),
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
  }, [monthlyData, selectedMetric, bmu]);

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

  const calculateDifferenceData = (data: ChartDataPoint[]) => {
    if (!bmu) return [];
    
    return data.map((item) => {
      const userValue = item[bmu];
      // Only calculate difference if the BMU has data for this period
      if (userValue === undefined) {
        return {
          date: item.date,
          difference: undefined
        };
      }

      const otherBMUs = Object.keys(item).filter(
        key => key !== "date" && key !== bmu && item[key] !== undefined
      );

      // Only calculate average if there are other BMUs with data
      if (otherBMUs.length === 0) {
        return {
          date: item.date,
          difference: undefined
        };
      }

      const otherAverage = otherBMUs.reduce((sum, key) => sum + (item[key] || 0), 0) / otherBMUs.length;
      
      return {
        date: item.date,
        difference: userValue - otherAverage
      };
    }).filter(item => item.difference !== undefined); // Remove periods with no difference
  };

  const differenceData = calculateDifferenceData(chartData);

  // Calculate trendline only for periods with valid differences
  const trendline = calculateTrendline(differenceData);

  // Create trendline data separately
  const trendlineData = differenceData.map((point) => {
    const trendValue = trendline.slope * point.date + trendline.intercept;
    return {
      date: point.date,
      difference: point.difference,
      trendline: trendValue
    };
  });

  // Get last 6 months of data
  const getRecentData = () => {
    if (!chartData.length) return [];
    const sortedData = [...chartData].sort((a, b) => b.date - a.date);
    return sortedData.slice(0, 6).reverse();
  };

  const recentData = getRecentData();

  if (loading) return <LoadingState />;
  if (!chartData || chartData.length === 0) {
    return (
      <WidgetCard title="Catch Metrics">
        <div className="h-96 w-full flex items-center justify-center">
          <span className="text-sm text-gray-500">No data available</span>
        </div>
      </WidgetCard>
    );
  }

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
          {!isCiaUser && (
            <div className="flex flex-wrap justify-end space-x-2">
              <button
                className={`px-3 py-1 text-sm ${localActiveTab === 'standard' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'} rounded shadow-sm transition duration-200 hover:bg-blue-600`}
                onClick={() => handleTabChange('standard')}
              >
                Standard
              </button>
              <button
                className={`px-3 py-1 text-sm ${localActiveTab === 'recent' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'} rounded shadow-sm transition duration-200 hover:bg-blue-600`}
                onClick={() => handleTabChange('recent')}
              >
                Recent
              </button>
            </div>
          )}
        </div>
      }
      className={className}
    >
      {localActiveTab === 'standard' && (
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
                  left: 48,
                  right: 48,
                  bottom: 40,
                  top: 10,
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
                    const date = new Date(unixTime);
                    return date.toLocaleDateString('en-US', { 
                      month: 'short',
                      year: '2-digit'
                    });
                  }}
                  interval="preserveStartEnd"
                  minTickGap={50}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={CustomYAxisTick}
                  width={60}
                  label={{
                    value: selectedMetricOption?.unit,
                    angle: -90,
                    position: "insideLeft",
                    offset: -20,
                    style: {
                      fontSize: 14,
                      fill: "#666666",
                      textAnchor: "middle",
                    },
                  }}
                />
                <Tooltip
                  content={(props: any) => (
                    <CustomTooltip {...props} selectedMetric={selectedMetric} />
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
      )}
      {localActiveTab === 'recent' && (
        <SimpleBar>
          <div className="h-96 w-full pt-9">
            <ResponsiveContainer
              width="100%"
              height="100%"
              {...(isTablet && { minWidth: "700px" })}
            >
              <BarChart
                data={recentData}
                margin={{
                  left: 48,
                  right: 48,
                  bottom: 40,
                  top: 10,
                }}
                barCategoryGap="20%"
                barGap={4}
                className="[&_.recharts-cartesian-axis-tick-value]:fill-gray-500 [&_.recharts-cartesian-axis.yAxis]:-translate-y-3 rtl:[&_.recharts-cartesian-axis.yAxis]:-translate-x-12 [&_.recharts-cartesian-grid-vertical]:opacity-0"
              >
                <CartesianGrid strokeDasharray="8 10" strokeOpacity={0.435} />
                <XAxis
                  dataKey="date"
                  scale="time"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(unixTime) => {
                    const date = new Date(unixTime);
                    return date.toLocaleDateString('en-US', { 
                      month: 'short',
                      year: '2-digit'
                    });
                  }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  padding={{ left: 30, right: 30 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={CustomYAxisTick}
                  width={60}
                  label={{
                    value: selectedMetricOption?.unit,
                    angle: -90,
                    position: "insideLeft",
                    offset: -20,
                    style: {
                      fontSize: 14,
                      fill: "#666666",
                      textAnchor: "middle",
                    },
                  }}
                />
                <Tooltip
                  content={(props: any) => (
                    <CustomTooltip {...props} selectedMetric={selectedMetric} />
                  )}
                />
                <Legend content={CustomLegend} />
                {Object.entries(siteColors).map(([site, color]) => (
                  <Bar
                    key={site}
                    dataKey={site}
                    name={site}
                    fill={color}
                    opacity={visibilityState[site]?.opacity ?? 1}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SimpleBar>
      )}
    </WidgetCard>
  );
}
