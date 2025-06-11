"use client";

import { useState, useMemo } from "react";
import { useTranslation } from "@/app/i18n/client";
import { useIndividualData } from "./hooks/useIndividualData";
import { useUserPermissions } from "./hooks/useUserPermissions";
import WidgetCard from "@components/cards/widget-card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import cn from "@utils/class-names";

// Custom Y-axis tick component for consistent styling
function CustomYAxisTick({ x = 0, y = 0, payload = { value: 0 }, selectedMetric }: any) {
  let formattedValue = Number.isInteger(payload.value) && payload.value > 999
    ? payload.value.toLocaleString()
    : payload.value.toFixed(1);
    
  // Add dollar sign for revenue and cost metrics
  if (selectedMetric === "fisher_rpue" || selectedMetric === "fisher_cost") {
    formattedValue = `$${formattedValue}`;
  }
    
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        className="text-xs fill-gray-500"
      >
        {formattedValue}
      </text>
    </g>
  );
}

const COLORS = {
  cpue: "#3b82f6", // blue
  rpue: "#10b981", // green
  cost: "#f59e0b", // amber
};

type MetricType = "fisher_cpue" | "fisher_rpue" | "fisher_cost";

export default function IndividualFisherTrends({ lang }: { lang?: string }) {
  const { t } = useTranslation("common");
  const { userFisherId, isIiaUser } = useUserPermissions();
  const { fisherData, isLoadingFisherData } = useIndividualData();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("fisher_cpue");

  // Only render for IIA users
  if (!isIiaUser || !userFisherId) {
    return null;
  }

  // Process daily data for chart
  const chartData = useMemo(() => {
    if (!fisherData || fisherData.length === 0) return [];
    
    // Sort by date and format for chart
    return fisherData
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(record => ({
        date: new Date(record.date).getTime(),
        dateDisplay: format(new Date(record.date), "MMM dd"),
        fullDate: record.date,
        // Convert null to undefined for gap rendering
        cpue: record.fisher_cpue ?? undefined,
        rpue: record.fisher_rpue ?? undefined,
        cost: record.fisher_cost ?? undefined,
        gear: record.gear ?? undefined,
        bmu: record.BMU,
      }));
  }, [fisherData]);

  // Calculate summary statistics (excluding NA values)
  const summaryStats = useMemo(() => {
    if (!fisherData || fisherData.length === 0) {
      return {
        avgCpue: 0,
        avgRpue: 0,
        avgCost: 0,
        totalDays: 0,
        fishingDays: 0,
      };
    }

    // Filter out records with null values
    const validCpueData = fisherData.filter(d => d.fisher_cpue != null);
    const validRpueData = fisherData.filter(d => d.fisher_rpue != null);
    const validCostData = fisherData.filter(d => d.fisher_cost != null);

    const avgCpue = validCpueData.length > 0 
      ? validCpueData.reduce((sum, d) => sum + d.fisher_cpue, 0) / validCpueData.length 
      : 0;
    const avgRpue = validRpueData.length > 0 
      ? validRpueData.reduce((sum, d) => sum + d.fisher_rpue, 0) / validRpueData.length 
      : 0;
    const avgCost = validCostData.length > 0 
      ? validCostData.reduce((sum, d) => sum + d.fisher_cost, 0) / validCostData.length 
      : 0;

    // Count actual fishing days (days with at least one non-null value)
    const fishingDays = fisherData.filter(d => 
      d.fisher_cpue != null || d.fisher_rpue != null || d.fisher_cost != null
    ).length;

    return {
      avgCpue: avgCpue.toFixed(2),
      avgRpue: avgRpue.toFixed(2),
      avgCost: avgCost.toFixed(2),
      totalDays: fisherData.length,
      fishingDays,
    };
  }, [fisherData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = payload[0].value;
      
      // Show "No data" for missing values
      if (value === undefined) {
        return (
          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
            <p className="text-sm font-medium text-gray-600 mb-2">{data.dateDisplay}</p>
            <p className="text-sm text-gray-500 italic">No data</p>
          </div>
        );
      }
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-600 mb-2">{data.dateDisplay}</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: COLORS[getMetricKey(selectedMetric)] }}
              />
              <p className="text-sm">
                <span className="font-medium">
                  {selectedMetric === "fisher_cpue" && "CPUE"}
                  {selectedMetric === "fisher_rpue" && "Revenue"}
                  {selectedMetric === "fisher_cost" && "Cost"}:
                </span>{" "}
                <span className="font-semibold">
                  {selectedMetric === "fisher_cpue" && `${value.toFixed(2)} kg/trip`}
                  {selectedMetric === "fisher_rpue" && `$${value.toFixed(2)}`}
                  {selectedMetric === "fisher_cost" && `$${value.toFixed(2)}`}
                </span>
              </p>
            </div>
            {data.gear && (
              <p className="text-xs text-gray-500 mt-1">
                Gear: {data.gear} | BMU: {data.bmu}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoadingFisherData) {
    return (
      <WidgetCard
        title={t('dashboard.yourDailyTrends')}
        className="h-full"
      >
        <div className="h-96 w-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-500">{t('common.loading')}</span>
          </div>
        </div>
      </WidgetCard>
    );
  }

  const getMetricKey = (metric: MetricType): keyof typeof COLORS => {
    return metric.replace("fisher_", "") as keyof typeof COLORS;
  };

  return (
    <WidgetCard
      title={t('dashboard.yourDailyTrends')}
      description={`${summaryStats.fishingDays} ${t('dashboard.fishingDays')} (${summaryStats.totalDays} total days)`}
      headerClassName="pb-2"
    >
      {/* Metric selector buttons */}
      <div className="grid w-full grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => setSelectedMetric("fisher_cpue")}
          className={cn(
            "px-3 py-2 rounded-md text-xs font-medium transition-colors",
            selectedMetric === "fisher_cpue"
              ? "bg-blue-100 text-blue-700 border-blue-200 border"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          CPUE {Number(summaryStats.avgCpue) > 0 && `(${summaryStats.avgCpue} avg)`}
        </button>
        <button
          onClick={() => setSelectedMetric("fisher_rpue")}
          className={cn(
            "px-3 py-2 rounded-md text-xs font-medium transition-colors",
            selectedMetric === "fisher_rpue"
              ? "bg-green-100 text-green-700 border-green-200 border"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          RPUE {Number(summaryStats.avgRpue) > 0 && `($${summaryStats.avgRpue} avg)`}
        </button>
        <button
          onClick={() => setSelectedMetric("fisher_cost")}
          className={cn(
            "px-3 py-2 rounded-md text-xs font-medium transition-colors",
            selectedMetric === "fisher_cost"
              ? "bg-amber-100 text-amber-700 border-amber-200 border"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          Cost {Number(summaryStats.avgCost) > 0 && `($${summaryStats.avgCost} avg)`}
        </button>
      </div>

      {/* Chart */}
      <div className="h-96 w-full pt-9">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
            barCategoryGap="10%"
          >
            <XAxis
              dataKey="date"
              tickFormatter={(timestamp) => format(new Date(timestamp), "MMM dd")}
              tickMargin={10}
              minTickGap={30}
              axisLine={false}
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tick={(props) => <CustomYAxisTick {...props} selectedMetric={selectedMetric} />}
              width={50}
            />
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <Tooltip content={<CustomTooltip />} />
            
            <Bar
              dataKey={selectedMetric === "fisher_cpue" ? "cpue" : selectedMetric === "fisher_rpue" ? "rpue" : "cost"}
              fill={COLORS[getMetricKey(selectedMetric)]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  );
} 