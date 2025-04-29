import React, { useEffect, useState } from "react";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Import shared MetricSelector component
import MetricSelector from "./charts/MetricSelector";
import { MetricKey, MetricOption } from "./charts/types";

// Define METRIC_OPTIONS if not imported from types
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

// Consistent color palette with other charts
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

interface GearData {
  BMU: string;
  gear: string;
  [key: string]: any;
}

interface VisibilityState {
  [key: string]: { opacity: number };
}

const LoadingState = () => {
  const { t } = useTranslation("common");
  return (
    <MetricCard
      title=""
      metric=""
      rounded="lg"
      chart={
        <div className="h-24 w-24 @[16.25rem]:h-28 @[16.25rem]:w-32 @xs:h-32 @xs:w-36 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-500">{t("text-loading")}</span>
          </div>
        </div>
      }
      chartClassName="flex flex-col w-auto h-auto text-center justify-center"
      className="min-w-[292px] w-full max-w-full flex flex-col items-center justify-center"
    />
  );
};

// Custom tooltip consistent with other charts
const CustomTooltip = ({ active, payload, label, selectedMetricOption }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload
            .filter((p: any) => p.value !== undefined && p.value !== null)
            .sort((a: any, b: any) => b.value - a.value)
            .map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <p className="text-sm">
                  <span className="font-medium">{entry.name}:</span>{" "}
                  <span className="font-semibold">{formatNumber(entry.value)}</span>
                </p>
              </div>
            ))}
        </div>
      </div>
    );
  }
  return null;
};

// Custom legend component consistent with other charts
const CustomLegend = ({ payload, visibilityState, handleLegendClick }: any) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-2">
      {payload?.map((entry: any) => {
        const key = entry.dataKey || entry.value;
        const opacity = visibilityState[key]?.opacity ?? 1;
        
        return (
          <div
            key={key}
            className="flex items-center gap-2 cursor-pointer select-none transition-all duration-200"
            onClick={() => handleLegendClick(key)}
            style={{ opacity }}
          >
            <div
              className="w-3 h-3 rounded-full transition-all duration-200"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium">{entry.value}</span>
          </div>
        );
      })}
    </div>
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
  const [barData, setBarData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation(lang!, "common");
  const [bmus] = useAtom(bmusAtom);
  const [siteColors, setSiteColors] = useState<Record<string, string>>({});
  const [visibilityState, setVisibilityState] = useState<VisibilityState>({});
  const numBMUs = (bmus || []).length;
  const containerHeight = numBMUs >= 4 ? 600 : (300 + (numBMUs * 300) / 4) - 150;

  const { data: rawData } = api.gear.summaries.useQuery({ bmus });
  const selectedMetricOption = METRIC_OPTIONS.find(
    (m) => m.value === selectedMetric
  );

  const handleLegendClick = (site: string) => {
    setVisibilityState((prev) => ({
      ...prev,
      [site]: {
        opacity: prev[site]?.opacity === 1 ? 0.2 : 1,
      },
    }));
  };

  useEffect(() => {
    if (!rawData) return;

    try {
      setLoading(true);

      // Extract unique BMUs from the data
      const uniqueBMUs = Array.from(
        new Set(rawData.map((d: GearData) => d.BMU))
      ).sort();

      // Create color mapping for BMUs
      const newSiteColors = uniqueBMUs.reduce<Record<string, string>>(
        (acc, site, index) => ({
          ...acc,
          [site]: generateColor(index, site, bmu),
        }),
        {}
      );
      setSiteColors(newSiteColors);

      // Set initial visibility state
      const initialVisibility = uniqueBMUs.reduce<VisibilityState>(
        (acc, site) => ({
          ...acc,
          [site]: { opacity: site === bmu ? 1 : 0.2 },
        }),
        {}
      );
      setVisibilityState(initialVisibility);

      // Extract unique gear types and sort by total metric value
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

      // Format data for the bar chart
      const transformedData = gearTypes.map((gear) => {
        const gearData: any = {
          name: capitalizeGearType(gear.replace(/_/g, " ")),
        };

        // Add data for each BMU
        rawData.forEach((d: GearData) => {
          if (d.gear === gear && typeof d[selectedMetric] === "number") {
            gearData[d.BMU] = Number(d[selectedMetric].toFixed(2));
          }
        });

        return gearData;
      });

      setBarData(transformedData);
      setError(null);
    } catch (error) {
      console.error("Error transforming data:", error);
      setError("Error processing data");
    } finally {
      setLoading(false);
    }
  }, [rawData, selectedMetric, bmu]);

  if (loading) return <LoadingState />;
  if (error) return <LoadingState />;
  if (!barData || barData.length === 0) return <LoadingState />;

  // Get unique BMUs for rendering bars
  const uniqueBMUs = Object.keys(siteColors);

  return (
    <WidgetCard
      title={
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between w-full gap-3">
          <div className="w-full sm:w-auto">
            <MetricSelector
              selectedMetric={selectedMetric}
              onMetricChange={setSelectedMetric}
              selectedMetricOption={selectedMetricOption}
            />
          </div>
          <div className="hidden sm:block text-base font-medium text-gray-800 mx-auto">
            <div className="text-center">
              {t("text-gear-distribution")}
            </div>
            <div className="text-xs text-gray-500 text-center mt-1">
              {t("text-gear-distribution-explanation")}
            </div>
          </div>
        </div>
      }
      className={cn("h-full", className)}
    >
      {/* Mobile-only title - shows on small screens */}
      <div className="sm:hidden text-center mb-4">
        <div className="text-base font-medium text-gray-800">
          {t("text-gear-distribution")}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {t("text-gear-distribution-explanation")}
        </div>
      </div>
      
      <SimpleBar>
        <div style={{ height: `${containerHeight}px` }} className="w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={70}
                tick={{ fontSize: 12, fill: "#64748b" }}
                interval={0}
                axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                tickLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                tickFormatter={(value) => formatNumber(value)}
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                content={(props) => <CustomTooltip {...props} selectedMetricOption={selectedMetricOption} />} 
                wrapperStyle={{ outline: 'none' }}
              />
              <Legend 
                content={(props) => (
                  <CustomLegend
                    {...props}
                    visibilityState={visibilityState}
                    handleLegendClick={handleLegendClick}
                  />
                )}
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ position: 'relative', marginTop: '10px' }}
              />
              {uniqueBMUs.map((bmu) => (
                <Bar
                  key={bmu}
                  dataKey={bmu}
                  name={bmu}
                  fill={siteColors[bmu]}
                  stroke={siteColors[bmu]}
                  fillOpacity={(visibilityState[bmu]?.opacity || 1) * 0.85}
                  strokeOpacity={visibilityState[bmu]?.opacity || 1}
                  radius={[4, 4, 0, 0]}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
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
