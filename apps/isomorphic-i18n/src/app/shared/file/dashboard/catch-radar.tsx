"use client";

import WidgetCard from "@components/cards/widget-card";
import { useAtom } from "jotai";
import React, { useEffect, useState } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { bmusAtom } from "@/app/components/filter-selector";
import { useTranslation } from "@/app/i18n/client";
import { api } from "@/trpc/react";
import cn from "@utils/class-names";

type MetricKey =
  | "mean_effort"
  | "mean_cpue"
  | "mean_cpua"
  | "mean_rpue"
  | "mean_rpua";

interface RadarData {
  month: string;
  [key: string]: number | string;
}

interface MetricInfo {
  label: string;
  unit: string;
}

interface VisibilityState {
  [key: string]: { opacity: number };
}

const METRIC_INFO: Record<MetricKey, MetricInfo> = {
  mean_effort: { label: "Effort", unit: "fishers/km²/day" },
  mean_cpue: { label: "Catch Rate", unit: "kg/fisher/day" },
  mean_cpua: { label: "Catch Density", unit: "kg/km²/day" },
  mean_rpue: { label: "Fisher Revenue", unit: "KSH/fisher/day" },
  mean_rpua: { label: "Area Revenue", unit: "KSH/km²/day" },
};

const getMetricLabel = (metric: string): string => {
  return METRIC_INFO[metric as MetricKey]?.label || "Catch Metrics";
};

const MONTH_ORDER = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
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

const CustomTooltip = ({ active, payload, metric }: any) => {
  if (active && payload && payload.length) {
    const metricInfo = METRIC_INFO[metric as MetricKey];
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-600 mb-2">
          {payload[0]?.payload?.month ?? ""}
        </p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <p className="text-sm">
              <span className="font-medium">{entry.name}:</span>{" "}
              {entry.value?.toFixed(1) ?? "N/A"} {metricInfo.unit}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const LoadingState = () => {
  return (
    <WidgetCard title="">
      <div className="h-96 w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading chart...</span>
        </div>
      </div>
    </WidgetCard>
  );
};

const CustomLegend = ({ payload, visibilityState, handleLegendClick }: any) => (
  <div className="flex flex-wrap gap-4 justify-center mt-2">
    {payload?.map((entry: any) => (
      <div
        key={entry.value}
        className={cn(
          "flex items-center gap-2 cursor-pointer select-none transition-all duration-200",
          "hover:opacity-80"
        )}
        style={{ opacity: visibilityState[entry.dataKey]?.opacity ?? 1 }}
        onClick={() => handleLegendClick(entry.dataKey)}
      >
        <div
          className="w-3 h-3 rounded-full transition-all duration-200"
          style={{ backgroundColor: entry.color }}
        />
        <span className="text-sm font-medium">{entry.value}</span>
      </div>
    ))}
  </div>
);

export default function CatchRadarChart({
  className,
  lang,
  selectedMetric,
  bmu,
  activeTab = 'standard',
}: {
  className?: string;
  lang?: string;
  selectedMetric: MetricKey;
  bmu?: string;
  activeTab?: string;
}) {
  const { t } = useTranslation(lang!);
  const [bmus] = useAtom(bmusAtom);

  const [data, setData] = useState<RadarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibilityState, setVisibilityState] = useState<VisibilityState>({});
  const [siteColors, setSiteColors] = useState<Record<string, string>>({});
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { data: meanCatch, isLoading: isFetching, error: queryError } =
    api.aggregatedCatch.meanCatchRadar.useQuery(
      { bmus, metric: selectedMetric },
      {
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        retry: 3,
      }
    );

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      console.error('Error fetching radar data:', queryError);
      setError('Failed to fetch data');
      setLoading(false);
    }
  }, [queryError]);

  useEffect(() => {
    // Set loading state when dependencies change
    setLoading(true);
    setError(null);

    // Don't process data if we're still fetching or if data is not available
    if (isFetching || !meanCatch) {
      return;
    }

    const processData = async () => {
      try {
        if (!Array.isArray(meanCatch) || meanCatch.length === 0) {
          setError("No data available");
          return;
        }

        // Extract unique BMUs from all data points
        const uniqueSitesSet = meanCatch.reduce((sites, item) => {
          Object.keys(item).forEach((key) => {
            if (key !== "month") sites.add(key);
          });
          return sites;
        }, new Set<string>());
        const uniqueSites: string[] = Array.from(uniqueSitesSet);

        // If no sites found, show error
        if (uniqueSites.length === 0) {
          setError("No BMU data available");
          return;
        }

        const newSiteColors = uniqueSites.reduce<Record<string, string>>(
          (acc: Record<string, string>, site: string, index: number) => {
            acc[site] = generateColor(index, site, bmu);
            return acc;
          },
          {}
        );
        setSiteColors(newSiteColors);

        const newVisibilityState: VisibilityState =
          uniqueSites.reduce<VisibilityState>(
            (acc: VisibilityState, site: string) => ({
              ...acc,
              [site]: { opacity: site === bmu ? 1 : 0.2 },
            }),
            {}
          );
        setVisibilityState(newVisibilityState);

        let processedData = [...meanCatch]
          .sort(
            (a, b) =>
              MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)
          )
          .map((item) => {
            const completeItem: RadarData = { month: item.month };
            uniqueSites.forEach((site) => {
              completeItem[site] =
                (item as Record<string, number | string>)[site] !== undefined
                  ? (item as Record<string, number | string>)[site]
                  : 0;
            });
            return completeItem;
          });

        // Calculate differenced data if needed
        if (activeTab === 'differenced' && bmu) {
          processedData = processedData.map(item => {
            const userValue = Number(item[bmu]);
            // Only calculate difference if the BMU has data for this month
            if (isNaN(userValue) || userValue === 0) {
              return {
                month: item.month,
                [bmu]: 0
              };
            }

            const otherBMUs = uniqueSites.filter(site => 
              site !== bmu && 
              !isNaN(Number(item[site])) && 
              Number(item[site]) !== 0
            );

            // Only calculate average if there are other BMUs with data
            if (otherBMUs.length === 0) {
              return {
                month: item.month,
                [bmu]: 0
              };
            }

            const otherAverage = otherBMUs.reduce((sum, site) => {
              return sum + Number(item[site] || 0);
            }, 0) / otherBMUs.length;

            return {
              month: item.month,
              [bmu]: userValue - otherAverage
            };
          }).filter(item => Number(item[bmu]) !== 0); // Remove months with no valid difference
        }

        setData(processedData);
        setError(null);
      } catch (e) {
        console.error("Error processing data:", e);
        setError("Error processing data");
      } finally {
        setLoading(false);
      }
    };

    processData();
  }, [meanCatch, selectedMetric, activeTab, bmu, isFetching]);

  // Remove the separate bmus effect since we handle loading in the main effect
  useEffect(() => {
    if (!bmus || bmus.length === 0) {
      setError("No BMUs selected");
      setLoading(false);
    }
  }, [bmus]);

  const handleLegendClick = (site: string) => {
    setVisibilityState((prev) => ({
      ...prev,
      [site]: {
        opacity: prev[site]?.opacity === 1 ? 0.2 : 1,
      },
    }));
  };

  if (loading || isFetching) return <LoadingState />;

  if (error) {
    return (
      <WidgetCard title="">
        <div className="h-96 w-full flex items-center justify-center">
          <span className="text-sm text-gray-500">Error: {error}</span>
        </div>
      </WidgetCard>
    );
  }

  if (!data || data.length === 0) {
    return (
      <WidgetCard title="">
        <div className="h-96 w-full flex items-center justify-center">
          <span className="text-sm text-gray-500">No data available</span>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard 
      title="" 
      className={cn(className)}
    >
      <div className="mt-5 h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={data}
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            className="w-full h-full"
          >
            <PolarGrid gridType="polygon" strokeWidth={0.8} />
            <PolarAngleAxis
              dataKey="month"
              tick={{ fill: "#666", fontSize: 12 }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={90}
              domain={activeTab === 'differenced' ? ['auto', 'auto'] : [0, 'auto']}
              tick={{ fill: "#666" }}
              tickCount={5}
              axisLine={false}
            />
            {Object.entries(siteColors).map(([site, color]) => {
              // In differenced mode, only show the selected BMU
              if (activeTab === 'differenced' && site !== bmu) {
                return null;
              }
              const opacity = visibilityState[site]?.opacity ?? 1;
              return (
                <Radar
                  key={site}
                  name={site}
                  dataKey={site}
                  stroke={activeTab === 'differenced' ? "#fc3468" : color}
                  fill={activeTab === 'differenced' ? "#fc3468" : color}
                  fillOpacity={opacity * 0.25}
                  strokeOpacity={opacity}
                />
              );
            })}
            <Tooltip
              content={(props) => (
                <CustomTooltip {...props} metric={selectedMetric} />
              )}
            />
            {activeTab !== 'differenced' && (
              <Legend
                content={(props) => (
                  <CustomLegend
                    {...props}
                    visibilityState={visibilityState}
                    handleLegendClick={handleLegendClick}
                  />
                )}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  );
}
