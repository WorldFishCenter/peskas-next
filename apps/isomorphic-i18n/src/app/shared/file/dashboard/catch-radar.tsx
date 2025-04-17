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
import { useSession } from "next-auth/react";

type MetricKey =
  | "mean_effort"
  | "mean_cpue"
  | "mean_cpua"
  | "mean_rpue"
  | "mean_rpua";

interface RadarData {
  month: string;
  year?: number;
  monthDisplay?: string;
  [key: string]: number | string | undefined;
}

interface MetricInfo {
  translationKey: string;
  unit: string;
}

interface VisibilityState {
  [key: string]: { opacity: number };
}

const METRIC_INFO: Record<MetricKey, MetricInfo> = {
  mean_effort: { translationKey: "text-metrics-effort", unit: "fishers/km²/day" },
  mean_cpue: { translationKey: "text-metrics-catch-rate", unit: "kg/fisher/day" },
  mean_cpua: { translationKey: "text-metrics-catch-density", unit: "kg/km²/day" },
  mean_rpue: { translationKey: "text-metrics-fisher-revenue", unit: "KSH/fisher/day" },
  mean_rpua: { translationKey: "text-metrics-area-revenue", unit: "KSH/km²/day" },
};

const getMetricLabel = (metric: string, t: any): string => {
  const metricKey = metric as MetricKey;
  const translationKey = METRIC_INFO[metricKey]?.translationKey || "text-metrics-catch";
  return t(translationKey);
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

const CustomTooltip = ({ active, payload, metric, t }: any) => {
  if (active && payload && payload.length) {
    const metricInfo = METRIC_INFO[metric as MetricKey];
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-600 mb-2">
          {payload[0]?.payload?.monthDisplay || 
            payload[0]?.payload?.month || ""}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <p className="text-sm">
                <span className="font-medium">{entry.name}:</span>{" "}
                <span className="font-semibold">{entry.value?.toFixed(1) ?? t("text-na")}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const LoadingState = ({ t }: { t: any }) => {
  return (
    <WidgetCard title="">
      <div className="h-96 w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          <span className="text-sm text-gray-500">{t("text-loading-chart")}</span>
        </div>
      </div>
    </WidgetCard>
  );
};

const CustomLegend = ({ payload, visibilityState, handleLegendClick, siteColors, localActiveTab }: any) => {
  // Helper function to safely get the site key from an entry
  const getSiteKey = (entry: any): string => {
    return entry.dataKey || entry.value || entry.name || '';
  };
  
  // Helper function to safely get opacity
  const getOpacity = (entry: any): number => {
    const key = getSiteKey(entry);
    return visibilityState[key]?.opacity ?? 1;
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center mt-2">
      {payload?.map((entry: any) => {
        const siteKey = getSiteKey(entry);
        return (
          <div
            key={siteKey || entry.value || Math.random().toString()}
            className="flex items-center gap-2 cursor-pointer select-none transition-all duration-200"
            onClick={() => handleLegendClick(siteKey)}
            style={{ opacity: getOpacity(entry) }}
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
  const { t } = useTranslation(lang!, "common");
  const [bmus] = useAtom(bmusAtom);
  const { data: session } = useSession();
  
  // Determine if the user is part of the CIA group
  const isCiaUser = session?.user?.groups?.some((group: { name: string }) => group.name === 'CIA');

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
      setError(t('text-failed-to-fetch-data'));
      setLoading(false);
    }
  }, [queryError, t]);

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
          setError(t("text-no-data-available"));
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
          setError(t("text-no-bmu-data-available"));
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

        // Filter for data from 2023 onwards
        // The data structure might not have a direct year field, or it might be in a different format
        // First, let's check if we have any year fields in the data
        const hasYearField = meanCatch.some(item => item.year !== undefined);
        
        let filteredMeanCatch = [...meanCatch];
        
        if (hasYearField) {
          // If year field exists, filter by it
          filteredMeanCatch = meanCatch.filter(item => {
            const year = item.year ? Number(item.year) : 0;
            return year >= 2023;
          });
          
          // If filtering removed all data, use the original data
          if (filteredMeanCatch.length === 0) {
            console.warn("No data found from 2023 onwards, showing all available data");
            filteredMeanCatch = [...meanCatch];
          }
        } else {
          // If there's no year field, we can't filter by year
          console.warn("Year field not found in data, showing all available data");
        }

        let processedData = [...filteredMeanCatch]
          .sort(
            (a, b) =>
              MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)
          )
          .map((item) => {
            const completeItem: RadarData = { 
              month: item.month,
              // Preserve year field if it exists
              ...(item.year !== undefined && { year: Number(item.year) })
            };
            
            // Format the month to include year if available
            if (item.year !== undefined) {
              completeItem.monthDisplay = `${item.month} ${item.year}`;
            } else {
              completeItem.monthDisplay = item.month;
            }
            
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
        setError(t("text-error-processing-data"));
      } finally {
        setLoading(false);
      }
    };

    processData();
  }, [meanCatch, selectedMetric, activeTab, bmu, isFetching, t]);

  // Remove the separate bmus effect since we handle loading in the main effect
  useEffect(() => {
    if (!bmus || bmus.length === 0) {
      setError(t("text-no-bmus-selected"));
      setLoading(false);
    }
  }, [bmus, t]);

  const handleLegendClick = (site: string) => {
    setVisibilityState((prev) => ({
      ...prev,
      [site]: {
        opacity: prev[site]?.opacity === 1 ? 0.2 : 1,
      },
    }));
  };

  if (loading || isFetching) return <LoadingState t={t} />;

  if (error) {
    return (
      <WidgetCard title={getMetricLabel(selectedMetric, t)}>
        <div className="h-96 w-full flex items-center justify-center">
          <span className="text-sm text-gray-500">{t("text-error")}: {error}</span>
        </div>
      </WidgetCard>
    );
  }

  if (!data || data.length === 0) {
    return (
      <WidgetCard title={getMetricLabel(selectedMetric, t)}>
        <div className="h-96 w-full flex items-center justify-center">
          <span className="text-sm text-gray-500">{t("text-no-data-available")}</span>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title={getMetricLabel(selectedMetric, t)}
      className={cn("h-full", className)}
    >
      <div className="h-96 w-full flex items-center justify-center">
        {/* Error state */}
        {error && (
          <div className="text-sm text-gray-500 flex items-center justify-center h-full">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && !error && (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Render chart if data is available */}
        {!loading && !error && data.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              data={data}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              className="w-full h-full"
              outerRadius="95%"
              cx="50%"
              cy="47%"
            >
              <PolarGrid 
                gridType="polygon" 
                strokeWidth={0.5} 
                stroke="#e2e8f0" 
                strokeDasharray="3 3"
              />
              <PolarAngleAxis
                dataKey={data[0]?.monthDisplay ? "monthDisplay" : "month"}
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 400 }}
                tickLine={false}
                stroke="#cbd5e1"
                strokeWidth={0.5}
              />
              <PolarRadiusAxis
                angle={90}
                domain={activeTab === 'differenced' ? ['auto', 'auto'] : [0, 'auto']}
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickCount={5}
                axisLine={false}
                stroke="#cbd5e1"
                strokeDasharray="3 3"
                strokeWidth={0.5}
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
                    fillOpacity={opacity * 0.35}
                    strokeOpacity={opacity}
                    strokeWidth={2}
                    dot
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    animationBegin={0}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                );
              })}
              <Tooltip
                content={(props) => (
                  <CustomTooltip {...props} metric={selectedMetric} t={t} />
                )}
                wrapperStyle={{ outline: 'none' }}
              />
              {activeTab !== 'differenced' && (
                <Legend
                  content={(props) => (
                    <CustomLegend
                      {...props}
                      visibilityState={visibilityState}
                      handleLegendClick={handleLegendClick}
                      siteColors={siteColors}
                      localActiveTab={activeTab}
                      isCiaUser={isCiaUser}
                    />
                  )}
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ position: 'absolute', bottom: '-15px', left: 0, right: 0 }}
                />
              )}
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </WidgetCard>
  );
}
