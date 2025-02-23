import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAtom } from "jotai";
import { ActionIcon, Popover } from "rizzui";
import WidgetCard from "@components/cards/widget-card";
import SimpleBar from "@ui/simplebar";
import { useTranslation } from "@/app/i18n/client";
import { api } from "@/trpc/react";
import { bmusAtom } from "@/app/components/filter-selector";
import cn from "@utils/class-names";
import { useTheme } from "next-themes";
import MetricCard from "@components/cards/metric-card";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type MetricKey =
  | "mean_effort"
  | "mean_cpue"
  | "mean_cpua"
  | "mean_rpue"
  | "mean_rpua";

interface MetricOption {
  value: MetricKey;
  label: string;
  unit: string;
  category: "catch" | "revenue";
}

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

const NO_DATA_COLOR = "#f4f4f4";
const YL_GN_BU = [
  "#ffffd9",
  "#edf8b1",
  "#c7e9b4",
  "#7fcdbb",
  "#41b6c4",
  "#1d91c0",
  "#225ea8",
  "#0c2c84",
];

const formatNumber = (value: number) => {
  if (value >= 1000) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(value);
  }
  return value.toFixed(1);
};

const capitalizeGearType = (gear: string) => {
  return gear
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const calculateDynamicRanges = (data: any[], metric: string) => {
  // Filter valid number values
  const values = data
    .map((d) => d[metric])
    .filter((val) => typeof val === "number" && !isNaN(val));

  if (values.length === 0) return [];

  // Sort the values (we don't want to modify the original array)
  const sorted = [...values].sort((a, b) => a - b);

  // Helper function to compute the qth quantile
  const quantile = (q: number) => {
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  };

  // Define boundaries at 0%, 12.5%, 25%, 37.5%, 50%, 62.5%, 75%, 87.5% and 100%
  const boundaries = [
    sorted[0],
    quantile(1 / 8),
    quantile(2 / 8),
    quantile(3 / 8),
    quantile(4 / 8),
    quantile(5 / 8),
    quantile(6 / 8),
    quantile(7 / 8),
    sorted[sorted.length - 1],
  ];

  // Create 8 buckets. For the last bucket, set "to" to Number.MAX_VALUE.
  const ranges = [];
  for (let i = 0; i < 8; i++) {
    ranges.push({
      from: Number(boundaries[i].toFixed(2)),
      to: i === 7 ? Number.MAX_VALUE : Number(boundaries[i + 1].toFixed(2)),
      color: YL_GN_BU[i], // Ensure your color palette has at least 8 colors.
    });
  }

  return ranges;
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
          <Popover.Content className="w-[280px] p-2 bg-white/75 backdrop-blur-sm">
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
                      <span>
                        {t(
                          `text-metrics-${option.label.toLowerCase().replace(/ /g, "-")}`
                        )}
                      </span>
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
                      <span>
                        {t(
                          `text-metrics-${option.label.toLowerCase().replace(/ /g, "-")}`
                        )}
                      </span>
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

interface GearData {
  BMU: string;
  gear: string;
  [key: string]: any;
}

const LoadingState = () => {
  return (
    <MetricCard
      title=""
      metric=""
      rounded="lg"
      chart={
        <div className="h-24 w-24 @[16.25rem]:h-28 @[16.25rem]:w-32 @xs:h-32 @xs:w-36 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Loading chart...</span>
          </div>
        </div>
      }
      chartClassName="flex flex-col w-auto h-auto text-center justify-center"
      className="min-w-[292px] w-full max-w-full flex flex-col items-center justify-center"
    />
  );
};

export default function GearHeatmap({
  className,
  lang,
  bmu,
}: {
  className?: string;
  lang?: string;
  bmu?: string;
}) {
  const { theme } = useTheme();
  const [selectedMetric, setSelectedMetric] =
    useState<MetricKey>("mean_effort");
  const [series, setSeries] = useState<any[]>([]);
  const [colorRanges, setColorRanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation(lang!, "common");
  const [bmus] = useAtom(bmusAtom);
  const numBMUs = (bmus || []).length;
  const containerHeight = numBMUs >= 4 ? 600 : (300 + (numBMUs * 300) / 4) - 150;

  const { data: rawData } = api.gear.summaries.useQuery({ bmus });
  const selectedMetricOption = METRIC_OPTIONS.find(
    (m) => m.value === selectedMetric
  );

  useEffect(() => {
    if (!rawData) return;

    try {
      setLoading(true);

      const dynamicRanges = calculateDynamicRanges(rawData, selectedMetric);
      const formattedRanges = dynamicRanges.map((range, index) => ({
        ...range,
        name:
          index === 0
            ? `< ${formatNumber(range.to)}`
            : index === dynamicRanges.length - 1
              ? `> ${formatNumber(range.from)}`
              : `${formatNumber(range.from)} - ${formatNumber(range.to)}`,
      }));

      setColorRanges([
        {
          from: -1,
          to: -1,
          color: theme === "dark" ? "#374151" : NO_DATA_COLOR,
          name: "No Data",
        },
        ...formattedRanges,
      ]);

      setColorRanges([
        {
          from: -1,
          to: -1,
          color: theme === "dark" ? "#374151" : NO_DATA_COLOR,
          name: "No Data",
        },  
        ...formattedRanges,
      ]);

      const bmuList = Array.from(
        new Set(rawData.map((d: GearData) => d.BMU))
      ).sort();
      const gearTypes = Array.from(
        new Set(rawData.map((d: GearData) => d.gear))
      ).sort((a, b) => {
        const aValue = rawData.reduce(
          (sum, curr) =>
            sum +
            (curr.gear === a && typeof curr[selectedMetric] === "number"
              ? curr[selectedMetric]
              : 0),
          0
        );
        const bValue = rawData.reduce(
          (sum, curr) =>
            sum +
            (curr.gear === b && typeof curr[selectedMetric] === "number"
              ? curr[selectedMetric]
              : 0),
          0
        );
        return bValue - aValue;
      });

      const transformedSeries = bmuList.map((bmu) => ({
        name: bmu,
        data: gearTypes.map((gear) => {
          const match = rawData.find((d) => d.BMU === bmu && d.gear === gear);
          const value =
            match && typeof match[selectedMetric] === "number"
              ? match[selectedMetric]
              : -1;
          return value > 0 ? Number(value.toFixed(2)) : -1;
        }),
      }));

      setSeries(transformedSeries);
      setError(null);
    } catch (error) {
      console.error("Error transforming data:", error);
      setError("Error processing data");
    } finally {
      setLoading(false);
    }
  }, [rawData, selectedMetric, theme]);

  const chartOptions = {
    chart: {
      type: "heatmap" as const,
      toolbar: {
        show: false,
      },
      fontFamily: "Inter, sans-serif",
      background: theme === "dark" ? "#1F2937" : "#FFFFFF",
      foreColor: theme === "dark" ? "#D1D5DB" : "#4B5563",
    },
    dataLabels: {
      enabled: true,
      style: {
        colors: [theme === "dark" ? "#FFFFFF" : "#000000"],
        fontSize: "14px",
        fontWeight: "600",
      },
      formatter: function (val: string | number | number[], opts?: any) {
        if (typeof val === "number" && val !== -1) {
          return formatNumber(val);
        }
        return "";
      },
    },
    plotOptions: {
      heatmap: {
        enableShades: false,
        colorScale: {
          ranges: colorRanges,
        },
      },
    },
    xaxis: {
      categories: Array.from(
        new Set(
          rawData?.map((d: GearData) =>
            capitalizeGearType(d.gear.replace(/_/g, " "))
          )
        )
      ),
      labels: {
        trim: true,
        style: {
          fontSize: "12px",
          colors: theme === "dark" ? "#D1D5DB" : "#4B5563",
        },
      },
      axisBorder: {
        color: theme === "dark" ? "#4B5563" : "#E5E7EB",
      },
      axisTicks: {
        color: theme === "dark" ? "#4B5563" : "#E5E7EB",
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: theme === "dark" ? "#D1D5DB" : "#4B5563",
        },
      },
    },
    grid: {
      show: true,
      borderColor: theme === "dark" ? "#374151" : "#E5E7EB",
      xaxis: {
        lines: {
          show: true,
          colors: theme === "dark" ? "#374151" : "#E5E7EB",
        },
      },
      yaxis: {
        lines: {
          show: true,
          colors: theme === "dark" ? "#374151" : "#E5E7EB",
        },
      },
    },
    legend: {
      show: true,
      position: "top" as const,
      fontSize: "12px",
      labels: {
        colors: theme === "dark" ? "#D1D5DB" : "#4B5563",
        useSeriesColors: false,
      },
      markers: {
        size: 10,
      },
      formatter: function (seriesName: string, opts?: any) {
        if (!opts) return seriesName;
        const range = colorRanges[opts.seriesIndex];
        if (!range) return "";
        return range.name;
      },
    },
    tooltip: {
      theme: theme as "light" | "dark",
      custom: function ({ series, seriesIndex, dataPointIndex, w }: any) {
        const value = series[seriesIndex][dataPointIndex];
        const bmu = w.globals.seriesNames[seriesIndex];
        const gearType = w.globals.labels[dataPointIndex];

        const bgColor = theme === "dark" ? "#374151" : "#FFFFFF";
        const textColor = theme === "dark" ? "#D1D5DB" : "#4B5563";
        const borderColor = theme === "dark" ? "#4B5563" : "#E5E7EB";

        if (value === -1) {
          return `
            <div class="p-2 rounded-lg shadow-lg" style="background: ${bgColor}; border: 1px solid ${borderColor}">
              <div class="text-sm font-medium" style="color: ${textColor}">BMU: ${bmu}</div>
              <div class="text-sm" style="color: ${textColor}">Gear Type: ${gearType}</div>
              <div class="text-sm font-medium mt-1" style="color: ${textColor}">No Data</div>
            </div>
          `;
        }

        return `
        <div class="p-2 rounded-lg shadow-lg" style="background: ${bgColor}; border: 1px solid ${borderColor}">
          <div class="text-sm font-medium" style="color: ${textColor}">BMU: ${bmu}</div>
          <div class="text-sm" style="color: ${textColor}">Gear Type: ${gearType}</div>
          <div class="text-sm font-medium mt-1" style="color: ${textColor}">${selectedMetricOption?.label}: ${formatNumber(value)} ${selectedMetricOption?.unit}</div>
        </div>
      `;
      },
    },
  };

  if (loading) return <LoadingState />;
  if (error) return <LoadingState />;
  if (!series || series.length === 0) return <LoadingState />;

  return (
    <WidgetCard
      title={
        <div className="flex items-center justify-between w-full">
          <MetricSelector
            selectedMetric={selectedMetric}
            onMetricChange={setSelectedMetric}
            selectedMetricOption={selectedMetricOption}
          />
        </div>
      }
      className={className}
    >
      <SimpleBar>
        <div style={{ height: `${containerHeight}px` }} className="w-full pt-9">
          <Chart
            options={chartOptions}
            series={series}
            type="heatmap"
            height="100%"
          />
        </div>
      </SimpleBar>
    </WidgetCard>
  );
}

const WidgetCardTitle = ({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-medium">{title}</h2>
      {children}
    </div>
  );
};

export { MetricSelector };
