"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
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
import { api } from "@/trpc/react";
import { getClientLanguage } from "@/app/i18n/language-link";
import { BASELINE_DATA, isIslandSite } from "./charts/siteConfig";
import { useAtom } from 'jotai';
import { selectedTimeRangeAtom } from "@/app/components/filter-selector";
import { getTimeRangeStartDate } from "./utils/timeRangeFilter";

// Custom Y-axis tick component for consistent styling
function CustomYAxisTick({ x = 0, y = 0, payload = { value: 0 }, selectedMetric }: any) {
  let formattedValue = Number.isInteger(payload.value) && payload.value > 999
    ? payload.value.toLocaleString()
    : payload.value.toFixed(1);
    
  // Add units based on metric
  if (selectedMetric === "mean_cpue") {
    formattedValue = `${formattedValue} kg`;
  } else if (selectedMetric === "mean_rpue" || selectedMetric === "mean_costs" || selectedMetric === "mean_profit") {
    formattedValue = `KES ${formattedValue}`;
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
  blue: "#3b82f6", // blue
  green: "#10b981", // green
  amber: "#f59e0b", // amber
  orange: "#f97316", // orange
  purple: "#9333ea", // purple
};

const METRIC_OPTIONS = [
  { key: 'mean_cpue', label: 'CPUE', color: 'blue', unit: 'kg/trip' },
  { key: 'mean_rpue', label: 'RPUE', color: 'green', unit: 'KES/trip' },
  { key: 'mean_costs', label: 'Costs', color: 'amber', unit: 'KES/trip' },
  { key: 'mean_profit', label: 'Profit', color: 'orange', unit: 'KES/trip' },
];

export default function IndividualFisherTrends({ 
  lang, 
  startDate, 
  endDate 
}: { 
  lang?: string;
  startDate?: Date | null;
  endDate?: Date;
}) {
  const { t, i18n } = useTranslation(lang || 'en');
  const [selectedTimeRange] = useAtom(selectedTimeRangeAtom);
  const { userFisherId, isIiaUser } = useUserPermissions();
  const [selectedMetric, setSelectedMetric] = useState<string>('mean_cpue');

  // Calculate date range based on selected time range
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = getTimeRangeStartDate(selectedTimeRange, endDate);
    return { startDate, endDate };
  }, [selectedTimeRange]);

  const { fisherData, isLoadingFisherData } = useIndividualData(dateRange);

  // Get the fisher's BMU from their data
  const fisherBMU = useMemo(() => {
    if (!fisherData || fisherData.length === 0) return null;
    return fisherData[0]?.BMU; // Assuming all records have the same BMU
  }, [fisherData]);

  // Fetch all data for the fisher's BMU to calculate average
  const { data: bmuData, isLoading: isLoadingBmuData } = api.individualData.all.useQuery(
    { bmus: fisherBMU ? [fisherBMU] : [] },
    { enabled: !!fisherBMU }
  );

  // Calculate BMU average data (excluding current fisher)
  const bmuAverageData = useMemo(() => {
    if (!bmuData || !userFisherId) return {};
    
    // Group by date and calculate averages excluding current fisher
    const dateGroups: Record<string, { 
      totalCpue: number; 
      totalRpue: number; 
      totalCost: number; 
      totalProfit: number;
      countCpue: number;
      countRpue: number;
      countCost: number;
      countProfit: number;
    }> = {};
    
    bmuData.forEach(record => {
      // Skip current fisher's data
      if (record.fisher_id === userFisherId) return;
      
      const dateKey = record.date.toString();
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = {
          totalCpue: 0,
          totalRpue: 0,
          totalCost: 0,
          totalProfit: 0,
          countCpue: 0,
          countRpue: 0,
          countCost: 0,
          countProfit: 0,
        };
      }
      
      if (record.mean_cpue != null) {
        dateGroups[dateKey].totalCpue += record.mean_cpue;
        dateGroups[dateKey].countCpue++;
      }
      if (record.mean_rpue != null) {
        dateGroups[dateKey].totalRpue += record.mean_rpue;
        dateGroups[dateKey].countRpue++;
      }
      if (record.mean_costs != null) {
        dateGroups[dateKey].totalCost += record.mean_costs;
        dateGroups[dateKey].countCost++;
      }
      if (record.mean_profit != null) {
        dateGroups[dateKey].totalProfit += record.mean_profit;
        dateGroups[dateKey].countProfit++;
      }
    });
    
    // Calculate averages
    const averages: Record<string, { cpue?: number; rpue?: number; cost?: number; profit?: number }> = {};
    Object.entries(dateGroups).forEach(([date, totals]) => {
      averages[date] = {
        cpue: totals.countCpue > 0 ? totals.totalCpue / totals.countCpue : undefined,
        rpue: totals.countRpue > 0 ? totals.totalRpue / totals.countRpue : undefined,
        cost: totals.countCost > 0 ? totals.totalCost / totals.countCost : undefined,
        profit: totals.countProfit > 0 ? totals.totalProfit / totals.countProfit : undefined,
      };
    });
    
    return averages;
  }, [bmuData, userFisherId]);

  // Process daily data for chart
  const chartData = useMemo(() => {
    if (!fisherData || fisherData.length === 0) return [];
    
    // Sort by date and format for chart
    return fisherData
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(record => {
        const avgData = bmuAverageData[record.date.toString()] || {};
        return {
          date: new Date(record.date).getTime(),
          dateDisplay: format(new Date(record.date), "MMM dd"),
          fullDate: record.date,
          // Fisher's own data
          cpue: record.mean_cpue ?? undefined,
          rpue: record.mean_rpue ?? undefined,
          cost: record.mean_costs ?? undefined,
          profit: record.mean_profit ?? undefined,
          priceKg: record.mean_price_kg ?? undefined,
          // BMU average data
          avgCpue: avgData.cpue,
          avgRpue: avgData.rpue,
          avgCost: avgData.cost,
          avgProfit: avgData.profit,
          bmu: record.BMU,
        };
      });
  }, [fisherData, bmuAverageData]);

  // Calculate summary statistics (excluding NA values)
  const summaryStats = useMemo(() => {
    if (!fisherData || fisherData.length === 0) {
      return {
        avgCpue: 0,
        avgRpue: 0,
        avgCost: 0,
        avgProfit: 0,
        totalDays: 0,
        fishingDays: 0,
      };
    }
    // Filter out records with null values
    const validCpueData = fisherData.filter(d => d.mean_cpue != null);
    const validRpueData = fisherData.filter(d => d.mean_rpue != null);
    const validCostData = fisherData.filter(d => d.mean_costs != null);
    const validProfitData = fisherData.filter(d => d.mean_profit != null);
    const avgCpue = validCpueData.length > 0 
      ? validCpueData.reduce((sum, d) => sum + d.mean_cpue, 0) / validCpueData.length 
      : 0;
    const avgRpue = validRpueData.length > 0 
      ? validRpueData.reduce((sum, d) => sum + d.mean_rpue, 0) / validRpueData.length 
      : 0;
    const avgCost = validCostData.length > 0 
      ? validCostData.reduce((sum, d) => sum + d.mean_costs, 0) / validCostData.length 
      : 0;
    const avgProfit = validProfitData.length > 0 
      ? validProfitData.reduce((sum, d) => sum + d.mean_profit, 0) / validProfitData.length 
      : 0;
    // Count actual fishing days (days with at least one non-null value)
    const fishingDays = fisherData.filter(d => 
      d.mean_cpue != null || d.mean_rpue != null || d.mean_costs != null || d.mean_profit != null
    ).length;
    return {
      avgCpue: avgCpue.toFixed(2),
      avgRpue: avgRpue.toFixed(2),
      avgCost: avgCost.toFixed(2),
      avgProfit: avgProfit.toFixed(2),
      totalDays: fisherData.length,
      fishingDays,
    };
  }, [fisherData]);

  // Only render for IIA users
  if (!isIiaUser || !userFisherId) {
    return null;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-600 mb-2">{data.dateDisplay}</p>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => {
              const value = entry.value;
              
              // Skip if no value
              if (value === undefined || value === null) return null;
              
              const isAverage = entry.dataKey.startsWith('avg');
              const color = isAverage ? "#6b7280" : COLORS[selectedMetric.replace("mean_", "") as keyof typeof COLORS];
              
              return (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <p className="text-sm">
                    <span className="font-medium">
                      {isAverage ? `${fisherBMU} ${t('text-average')}` : t('text-your')} 
                      {selectedMetric === "mean_cpue" && ` ${t('text-cpue')}`}
                      {selectedMetric === "mean_rpue" && ` ${t('text-rpue')}`}
                      {selectedMetric === "mean_costs" && ` ${t('text-costs')}`}
                      {selectedMetric === "mean_profit" && ` ${t('text-profit')}`}
                    </span>{" "}
                    <span className="font-semibold">
                      {selectedMetric === "mean_cpue" && `${value.toFixed(2)} kg/trip`}
                      {selectedMetric === "mean_rpue" && `KES ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/trip`}
                      {selectedMetric === "mean_costs" && `KES ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/trip`}
                      {selectedMetric === "mean_profit" && `KES ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/trip`}
                    </span>
                  </p>
                </div>
              );
            })}
            {payload.length === 0 && (
              <p className="text-sm text-gray-500 italic">{t('text-no-data')}</p>
            )}
            {data.bmu && (
              <p className="text-xs text-gray-500 mt-1 border-t pt-1">
                {data.bmu}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoadingFisherData || isLoadingBmuData) {
    return (
      <WidgetCard
        title={t('text-your-daily-trends')}
        className="h-full"
      >
        <div className="h-96 w-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-500">{t('text-loading')}</span>
          </div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title={t('text-your-daily-trends')}
      description={
        <span>
          {summaryStats.fishingDays} {t('text-fishing-days')} ({summaryStats.totalDays} {t('text-total-days')}) - {t('text-compared-with-bmu-average', { bmu: fisherBMU })}
        </span>
      }
      headerClassName="pb-2"
    >
      {/* Metric selector buttons */}
      <div className="flex w-full gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200">
        {METRIC_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => setSelectedMetric(option.key)}
            className={cn(
              "px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
              selectedMetric === option.key
                ? "bg-blue-100 text-blue-700 border-blue-200 border"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {option.label} {Number(summaryStats[option.key.replace("mean_", "") as keyof typeof summaryStats]) > 0 && `(${summaryStats[option.key.replace("mean_", "") as keyof typeof summaryStats]} ${t('text-average').toLowerCase()})`}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-96 w-full pt-9">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 50, left: 30, bottom: 0 }}
            barGap={0}
            barCategoryGap={300}
          >
            <XAxis
              dataKey="date"
              tickFormatter={(timestamp) => format(new Date(timestamp), "MMM yyyy")}
              tickCount={8}
              minTickGap={5}
              tickMargin={10}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tick={(props) => <CustomYAxisTick {...props} selectedMetric={selectedMetric} />}
              width={50}
            />
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <Tooltip content={<CustomTooltip />} />
            {/* Fisher's own data as bars */}
            <Bar
              dataKey={selectedMetric === "mean_cpue" ? "cpue" : selectedMetric === "mean_rpue" ? "rpue" : selectedMetric === "mean_costs" ? "cost" : "profit"}
              fill="#F79F79"
              name={t('text-your-performance')}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            {/* BMU Average as bars (slightly lighter color) */}
            <Bar
              dataKey={selectedMetric === "mean_cpue" ? "avgCpue" : selectedMetric === "mean_rpue" ? "avgRpue" : selectedMetric === "mean_costs" ? "avgCost" : "avgProfit"}
              fill="#8693AB"
              name={`${fisherBMU} ${t('text-average')}`}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            {/* Income baseline reference lines (only for RPUE) */}
            {selectedMetric === "mean_rpue" && (
              <>
                <ReferenceLine
                  y={BASELINE_DATA.INCOME.POVERTY_LINE}
                  stroke="#ef4444"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  label={{ value: t('text-poverty-line'), position: "right", fill: "#ef4444", fontSize: 11 }}
                />
                <ReferenceLine
                  y={BASELINE_DATA.INCOME.NATIONAL_MINIMUM_WAGE}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  label={{ value: t('text-minimum-wage'), position: "right", fill: "#f59e0b", fontSize: 11 }}
                />
                <ReferenceLine
                  y={BASELINE_DATA.INCOME.LIVING_WAGE}
                  stroke="#22c55e"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  label={{ value: t('text-living-wage'), position: "right", fill: "#22c55e", fontSize: 11 }}
                />
              </>
            )}
            {/* Zero line for profit plot */}
            {selectedMetric === "mean_profit" && (
              <ReferenceLine
                y={0}
                stroke="#9ca3af"
                strokeDasharray="2 2"
                strokeWidth={1.2}
                label={{ value: '0', position: "right", fill: "#9ca3af", fontSize: 11 }}
              />
            )}
            {/* Legend */}
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="rect"
              wrapperStyle={{ paddingTop: '10px' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  );
} 