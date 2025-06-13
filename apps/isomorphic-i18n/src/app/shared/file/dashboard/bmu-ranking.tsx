"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAtom } from "jotai";
import WidgetCard from "@components/cards/widget-card";
import SimpleBar from "@ui/simplebar";
import { useTranslation } from "@/app/i18n/client";
import { api } from "@/trpc/react";
import { bmusAtom, selectedMetricAtom } from "@/app/components/filter-selector";
import cn from "@utils/class-names";
import MetricCard from "@components/cards/metric-card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Import shared components and types
import { MetricOption } from "./charts/types";
import useUserPermissions from "./hooks/useUserPermissions";
import { generateColor, updateBmuColorRegistry } from "./charts/utils";

// Define METRIC_OPTIONS consistent with other components
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

const formatNumber = (value: number) => {
  if (value >= 1000) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(value);
  }
  return value.toFixed(1);
};

interface BMURankingData {
  name: string;
  value: number;
  fill: string;
  rank: number;
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
const CustomTooltip = ({ active, payload, selectedMetricOption }: any) => {
  const { t } = useTranslation("common");

  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-600 mb-2">
          #{data.rank} - {data.name}
        </p>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.fill }}
          />
          <p className="text-sm">
            <span className="font-medium">{selectedMetricOption?.label}:</span>{" "}
            <span className="font-semibold">
              {data.value !== undefined && data.value !== null
                ? formatNumber(data.value)
                : t("text-na")}
            </span>
            {selectedMetricOption?.unit && (
              <span className="text-gray-500 ml-1">
                {selectedMetricOption.unit}
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// Custom Y-axis tick to highlight user's BMU
const CustomYAxisTick = ({ x = 0, y = 0, payload = { value: '' }, userBMU }: any) => {
  const isUserBMU = payload.value === userBMU;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-5}
        y={0}
        dy={4}
        textAnchor="end"
        className={cn(
          "text-xs",
          isUserBMU ? "fill-blue-600 font-semibold" : "fill-gray-500"
        )}
      >
        {payload.value}
      </text>
      {isUserBMU && (
        <text
          x={-5}
          y={0}
          dy={16}
          textAnchor="end"
          className="text-[10px] fill-blue-500"
        >
          (Your BMU)
        </text>
      )}
    </g>
  );
};

export default function BMURanking({
  className,
  lang,
  bmu,
}: {
  className?: string;
  lang?: string;
  bmu?: string;
}) {
  const [rankingData, setRankingData] = useState<BMURankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation(lang!, "common");
  const [bmus] = useAtom(bmusAtom);
  const [selectedMetric] = useAtom(selectedMetricAtom);

  // Add refs to track initialization states
  const dataProcessed = useRef<boolean>(false);
  const previousMetric = useRef<string>(selectedMetric);
  const previousBmus = useRef<string[]>(bmus);

  // Use the centralized permissions hook
  const {
    userBMU,
    isCiaUser,
    isAdmin,
    getAccessibleBMUs,
    hasRestrictedAccess,
  } = useUserPermissions();

  // Determine which BMU to use for highlighting - prefer passed prop, then user's BMU
  const effectiveBMU = bmu || userBMU;

  // Ensure bmus is always an array
  const safeBmus = bmus || [];

  // Fetch aggregated monthly data for BMU ranking
  const { data: rawData, refetch } = api.aggregatedCatch.monthly.useQuery(
    { bmus: safeBmus },
    {
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      retry: 3,
      enabled: safeBmus.length > 0,
    }
  );

  // Force refetch when bmus changes
  useEffect(() => {
    if (JSON.stringify(previousBmus.current) !== JSON.stringify(safeBmus)) {
      console.log('BMUs changed, refetching BMU ranking data');
      dataProcessed.current = false;
      previousBmus.current = [...safeBmus];
      refetch();
    }
  }, [safeBmus, refetch]);

  const selectedMetricOption = METRIC_OPTIONS.find(
    (m) => m.value === selectedMetric
  );

  useEffect(() => {
    if (!rawData) return;

    // Reset data processing flag if metric has changed
    if (previousMetric.current !== selectedMetric) {
      dataProcessed.current = false;
      previousMetric.current = selectedMetric;
    }

    // Skip processing if already done and not changing key dependencies
    if (dataProcessed.current && rankingData.length > 0 && !loading) return;

    try {
      setLoading(true);
      setError(null);

      // Group data by BMU and calculate averages
      const bmuAverages: Record<string, { total: number; count: number }> = {};

      rawData.forEach((item: any) => {
        const bmuName = item.landing_site;
        const value = item[selectedMetric];

        if (value !== undefined && value !== null && typeof value === 'number') {
          if (!bmuAverages[bmuName]) {
            bmuAverages[bmuName] = { total: 0, count: 0 };
          }
          bmuAverages[bmuName].total += value;
          bmuAverages[bmuName].count += 1;
        }
      });

      // Get all BMU names and update color registry to ensure unique colors
      const bmuNames = Object.keys(bmuAverages);
      updateBmuColorRegistry(bmuNames);

      // Calculate averages and create ranking data
      const rankingData: BMURankingData[] = Object.entries(bmuAverages)
        .map(([bmuName, data]) => ({
          name: bmuName,
          value: Number((data.total / data.count).toFixed(2)),
          fill: generateColor(0, bmuName, effectiveBMU),
          rank: 0, // Will be set after sorting
        }))
        .sort((a, b) => b.value - a.value)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
        }));

      // Filter based on user permissions
      const accessibleBMUs = hasRestrictedAccess
        ? getAccessibleBMUs(rankingData.map(item => item.name))
        : rankingData.map(item => item.name);

      const filteredRankingData = rankingData.filter(item =>
        accessibleBMUs.includes(item.name)
      );

      setRankingData(filteredRankingData);
      dataProcessed.current = true;
      setError(null);
    } catch (error) {
      console.error("Error transforming BMU ranking data:", error);
      setError("Error processing data");
    } finally {
      setLoading(false);
    }
  }, [rawData, selectedMetric, effectiveBMU, hasRestrictedAccess, getAccessibleBMUs, safeBmus, rankingData.length, loading]);

  // If in CIA mode, don't render the ranking as it doesn't make sense to show a comparison
  // ranking with just one BMU
  if (isCiaUser) {
    return null;
  }

  if (loading) return <LoadingState />;
  if (error) return <LoadingState />;
  if (!rankingData || rankingData.length === 0) return <LoadingState />;

  // Dynamic title and description based on selected metric
  const getTitle = () => {
    if (selectedMetricOption?.category === 'revenue') {
      return t("text-bmu-ranking-title-revenue");
    }
    return t("text-bmu-ranking-title-catch");
  };

  const getDescription = () => {
    const metricLabel = selectedMetricOption?.label || t("text-selected-metric");
    const unit = selectedMetricOption?.unit || "";

    if (selectedMetricOption?.category === 'revenue') {
      return t("text-bmu-ranking-description-revenue", { metric: metricLabel, unit: unit });
    }
    return t("text-bmu-ranking-description-catch", { metric: metricLabel, unit: unit });
  };

  return (
    <WidgetCard
      title={
        <div className="flex flex-col sm:flex-row items-start sm:items-center w-full gap-3">
          <div className="hidden sm:block text-base font-medium text-gray-800 flex-1">
            <div className="text-center">
              {getTitle()}
            </div>
            <div className="text-xs text-gray-500 text-center mt-1">
              {getDescription()}
            </div>
          </div>
        </div>
      }
      className={cn("h-full", className)}
    >
      {/* Mobile-only title - shows on small screens */}
      <div className="sm:hidden text-center mb-4">
        <div className="text-base font-medium text-gray-800">
          {getTitle()}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {getDescription()}
        </div>
      </div>

      <SimpleBar>
        <div className="w-full pt-4" style={{ height: Math.max(300, rankingData.length * 40 + 220) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rankingData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(value) => formatNumber(value)}
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                tickLine={{ stroke: "#cbd5e1" }}
                label={{
                  value: `${selectedMetricOption?.label || "Value"} (${selectedMetricOption?.unit || ""})`,
                  position: 'insideBottom',
                  offset: -10,
                  style: {
                    fontSize: 14,
                    fill: "#475569",
                    fontWeight: 500
                  }
                }}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={<CustomYAxisTick userBMU={userBMU} />}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip
                content={(props) => <CustomTooltip {...props} selectedMetricOption={selectedMetricOption} />}
                wrapperStyle={{ outline: 'none' }}
              />
              <Bar
                dataKey="value"
                name={selectedMetricOption?.label || "Value"}
                radius={[0, 4, 4, 0]}
                isAnimationActive={false}
              >
                {rankingData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SimpleBar>
    </WidgetCard>
  );
} 