"use client";

import { useState, useMemo } from "react";
import { useTranslation } from "@/app/i18n/client";
import { useIndividualData } from "./hooks/useIndividualData";
import { useUserPermissions } from "./hooks/useUserPermissions";
import WidgetCard from "@components/cards/widget-card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import cn from "@utils/class-names";

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
      .sort((a, b) => new Date(a.landing_date).getTime() - new Date(b.landing_date).getTime())
      .map(record => ({
        date: format(new Date(record.landing_date), "MMM dd"),
        fullDate: record.landing_date,
        cpue: record.fisher_cpue,
        rpue: record.fisher_rpue,
        cost: record.fisher_cost,
        gear: record.gear,
        bmu: record.BMU,
      }));
  }, [fisherData]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!fisherData || fisherData.length === 0) {
      return {
        avgCpue: 0,
        avgRpue: 0,
        avgCost: 0,
        totalDays: 0,
      };
    }

    const totalDays = fisherData.length;
    const avgCpue = fisherData.reduce((sum, d) => sum + d.fisher_cpue, 0) / totalDays;
    const avgRpue = fisherData.reduce((sum, d) => sum + d.fisher_rpue, 0) / totalDays;
    const avgCost = fisherData.reduce((sum, d) => sum + d.fisher_cost, 0) / totalDays;

    return {
      avgCpue: avgCpue.toFixed(2),
      avgRpue: avgRpue.toFixed(2),
      avgCost: avgCost.toFixed(2),
      totalDays,
    };
  }, [fisherData]);

  const formatYAxis = (value: number) => {
    if (selectedMetric === "fisher_rpue" || selectedMetric === "fisher_cost") {
      return `$${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg bg-white p-3 shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            {selectedMetric === "fisher_cpue" && `CPUE: ${data.cpue.toFixed(2)} kg/trip`}
            {selectedMetric === "fisher_rpue" && `RPUE: $${data.rpue.toFixed(2)}`}
            {selectedMetric === "fisher_cost" && `Cost: $${data.cost.toFixed(2)}`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Gear: {data.gear} | BMU: {data.bmu}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoadingFisherData) {
    return (
      <WidgetCard
        title={t('dashboard.yourDailyTrends')}
        className="min-h-[400px]"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-gray-500">{t('common.loading')}</div>
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
      description={`${t('dashboard.last')} ${summaryStats.totalDays} ${t('dashboard.fishingDays')}`}
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
          CPUE ({summaryStats.avgCpue} avg)
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
          RPUE (${summaryStats.avgRpue} avg)
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
          Cost (${summaryStats.avgCost} avg)
        </button>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            fontSize={12}
            tick={{ fill: '#6b7280' }}
          />
          <YAxis 
            fontSize={12}
            tick={{ fill: '#6b7280' }}
            tickFormatter={formatYAxis}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey={selectedMetric === "fisher_cpue" ? "cpue" : selectedMetric === "fisher_rpue" ? "rpue" : "cost"}
            stroke={COLORS[getMetricKey(selectedMetric)]}
            strokeWidth={2}
            dot={{ r: 4, fill: COLORS[getMetricKey(selectedMetric)] }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </WidgetCard>
  );
} 