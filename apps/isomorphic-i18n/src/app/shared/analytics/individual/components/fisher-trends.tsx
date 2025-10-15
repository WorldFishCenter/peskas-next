"use client";

import React, { useState, useMemo } from "react";
import { useTranslation } from "@/app/i18n/client";
import { useIndividualData } from "../hooks/use-individual-data";
import useUserPermissions from "../../core/hooks/use-user-permissions";
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
  Cell,
} from "recharts";
import { format } from "date-fns";
import cn from "@utils/class-names";
import { api } from "@/trpc/react";
import { BASELINE_DATA } from "../../charts/utils/site-config";
import { useAtom } from 'jotai';
import { selectedTimeRangeAtom, selectedMetricAtom } from "@/app/components/filter-selector";
import { MetricKey } from "../../charts/utils/chart-types";
import { getTimeRangeStartDate } from "../../core/utils/time-range-filter";
import SimpleBar from "@ui/simplebar";

// Custom Y-axis tick component for consistent styling
function CustomYAxisTick({ x = 0, y = 0, payload = { value: 0 }, selectedMetric }: any) {
  const formattedValue = Number.isInteger(payload.value) && payload.value > 999
    ? payload.value.toLocaleString()
    : payload.value.toFixed(1);
    
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

export default function IndividualFisherTrends({ 
  lang, 
}: { 
  lang?: string;
  startDate?: Date | null;
  endDate?: Date;
}) {
  const { t, i18n } = useTranslation(lang || 'en');
  const [selectedTimeRange] = useAtom(selectedTimeRangeAtom);
  const { userFisherId, isIiaUser, isAdminFisher, shouldShowIndividualData, canCompareWithOthers, canSeeBMUData } = useUserPermissions();
  
  // All users who see individual charts use global header metric selector
  const [globalSelectedMetric, setGlobalSelectedMetric] = useAtom(selectedMetricAtom);
  const selectedMetric = globalSelectedMetric;
  const setSelectedMetric = (metric: string) => setGlobalSelectedMetric(metric as MetricKey);

  // Add tab state for comparison mode
  const [activeTab, setActiveTab] = useState("trends");

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

  // Process daily data for chart
  const chartData = useMemo(() => {
    if (!fisherData || fisherData.length === 0) return [];
    
    // Sort by date and format for chart
    return fisherData
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(record => {
        return {
          date: new Date(record.date).getTime(),
          dateDisplay: format(new Date(record.date), "MMM dd"),
          fullDate: record.date,
          // Fisher's own data
          cpue: record.mean_cpue ?? undefined,
          rpue: record.mean_rpue ?? undefined,
          cost: record.mean_cost ?? undefined,
          profit: record.mean_profit ?? undefined,
          priceKg: record.mean_price_kg ?? undefined,
          bmu: record.BMU,
        };
      });
  }, [fisherData]);

  // Calculate comparison data (fisher's data vs baseline)
  const comparisonData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];

    // Calculate the fisher's average for the selected metric over the time range
    const metricKey = selectedMetric === "mean_cpue" ? "cpue" :
                     selectedMetric === "mean_rpue" ? "rpue" :
                     selectedMetric === "mean_cost" ? "cost" : "profit";

    const validValues = chartData
      .map(point => point[metricKey])
      .filter(value => value !== undefined && value !== null);

    if (validValues.length === 0) return [];

    // Determine the baseline based on the metric
    let baseline: number;

    if (selectedMetric === 'mean_rpue') {
      // For fisher revenue, use living wage baseline
      baseline = BASELINE_DATA.INCOME.LIVING_WAGE;
    } else if (selectedMetric === 'mean_cpue' && fisherBMU) {
      // For fisher CPUE, use BMU-specific recommended CPUE baseline
      const { getCpueBaseline } = require('../../charts/utils/site-config');
      const cpueBaseline = getCpueBaseline(fisherBMU);
      baseline = cpueBaseline !== null ? cpueBaseline : validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
    } else {
      // For other metrics, use the fisher's own average
      baseline = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
    }

    // Create comparison data showing difference from baseline
    return chartData.map(point => {
      const value = point[metricKey];
      const difference = value !== undefined && value !== null ? value - baseline : undefined;

      return {
        ...point,
        [metricKey]: value, // Keep original value for trends
        difference: difference, // Difference from baseline for comparison
        average: baseline, // Store baseline for reference
      };
    });
  }, [chartData, selectedMetric, fisherBMU]);

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
    const validCostData = fisherData.filter(d => d.mean_cost != null);
    const validProfitData = fisherData.filter(d => d.mean_profit != null);
    const avgCpue = validCpueData.length > 0 
      ? validCpueData.reduce((sum, d) => sum + d.mean_cpue, 0) / validCpueData.length 
      : 0;
    const avgRpue = validRpueData.length > 0 
      ? validRpueData.reduce((sum, d) => sum + d.mean_rpue, 0) / validRpueData.length 
      : 0;
    const avgCost = validCostData.length > 0 
      ? validCostData.reduce((sum, d) => sum + d.mean_cost, 0) / validCostData.length 
      : 0;
    const avgProfit = validProfitData.length > 0 
      ? validProfitData.reduce((sum, d) => sum + d.mean_profit, 0) / validProfitData.length 
      : 0;
    // Count actual fishing days (days with at least one non-null value)
    const fishingDays = fisherData.filter(d => 
      d.mean_cpue != null || d.mean_rpue != null || d.mean_cost != null || d.mean_profit != null
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

  // Only render for users who should see individual data (IIA users or admin-fishers)
  if (!shouldShowIndividualData || !userFisherId) {
    return null;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      // Get values for both bars
      const metricKey = selectedMetric === "mean_cpue" ? "cpue" : selectedMetric === "mean_rpue" ? "rpue" : selectedMetric === "mean_cost" ? "cost" : "profit";
      const yourValue = data[metricKey];
      const difference = data.difference;
      const average = data.average;
      // Metric-specific label
      const metricLabel = selectedMetric === "mean_cpue" ? t('text-cpue') : selectedMetric === "mean_rpue" ? t('text-rpue') : selectedMetric === "mean_cost" ? t('text-costs') : t('text-profit');
      // Format value
      const formatValue = (val: number) => {
        if (selectedMetric === "mean_cpue") return `${val.toFixed(2)} kg/trip`;
        return `KES ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/trip`;
      };
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-600 mb-2">{format(new Date(data.fullDate), 'MMM yyyy')}</p>
          <div className="space-y-1.5">
            {/* Your Performance */}
            {yourValue !== undefined && yourValue !== null && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F79F79' }} />
                <p className="text-sm font-medium">
                  You {metricLabel} <span className="font-semibold">{formatValue(yourValue)}</span>
                </p>
              </div>
            )}
            {/* Average */}
            {average !== undefined && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8693AB' }} />
                <p className="text-sm font-medium">
                  {selectedMetric === "mean_rpue" ? t('text-living-wage') :
                   selectedMetric === "mean_cpue" ? t('text-recommended-catch-rate') :
                   "Your Average"} {metricLabel} <span className="font-semibold">{formatValue(average)}</span>
                </p>
              </div>
            )}
            {/* Difference */}
            {difference !== undefined && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{
                  backgroundColor: (() => {
                    // For costs, lower is better (green), higher is worse (red)
                    const isCostMetric = selectedMetric === "mean_cost";
                    return isCostMetric
                      ? (difference > 0 ? '#ef4444' : '#10b981')  // Inverted for costs
                      : (difference > 0 ? '#10b981' : '#ef4444'); // Normal for others
                  })()
                }} />
                <p className="text-sm font-medium">
                  {selectedMetric === "mean_rpue" ? t('text-difference-from-living-wage') :
                   selectedMetric === "mean_cpue" ? t('text-difference-from-average') :
                   "Difference"} <span className={`font-semibold ${(() => {
                    const isCostMetric = selectedMetric === "mean_cost";
                    return isCostMetric
                      ? (difference > 0 ? 'text-red-600' : 'text-green-600')   // Inverted for costs
                      : (difference > 0 ? 'text-green-600' : 'text-red-600');  // Normal for others
                  })()}`}>
                    {difference > 0 ? '+' : ''}{formatValue(difference)}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Get tab title and description functions
  const getTabTitle = (tab: string): string => {
    switch(tab) {
      case 'trends':
        return t("text-your-monthly-trends");
      case 'comparison':
        if (selectedMetric === "mean_rpue") {
          return t("text-performance-vs-living-wage");
        } else if (selectedMetric === "mean_cpue") {
          return t("text-performance-vs-cpue-baseline");
        } else {
          return t("text-performance-vs-your-average");
        }
      default:
        return t("text-your-monthly-trends");
    }
  };

  const getTabDescription = (tab: string): string => {
    switch(tab) {
      case 'trends':
        return t("text-trends-explanation");
      case 'comparison':
        if (selectedMetric === "mean_rpue") {
          return t("text-cia-living-wage-comparison-explanation");
        } else if (selectedMetric === "mean_cpue") {
          return t("text-cia-cpue-comparison-explanation");
        } else {
          return t("text-comparison-vs-your-average-explanation");
        }
      default:
        return t("text-trends-explanation");
    }
  };

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  if (isLoadingFisherData) {
    return (
      <WidgetCard
        title={t('text-your-monthly-trends')}
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
      title={
        <div className="flex flex-col sm:flex-row items-start sm:items-center w-full gap-3">
          <div className="hidden sm:block text-base font-medium text-gray-800 flex-1">
            <div className="text-center">
              {getTabTitle(activeTab)}
            </div>
            <div className="text-xs text-gray-500 text-center mt-1">
              {getTabDescription(activeTab)}
            </div>
          </div>
          {/* Show tabs for all users */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:flex-shrink-0">
            <button
              className={`px-4 py-2 text-sm rounded-md transition duration-200 ${activeTab === 'trends' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} w-full sm:w-auto`}
              onClick={() => handleTabChange('trends')}
            >
              {t("text-trends-tab")}
            </button>
            <button
              className={`px-4 py-2 text-sm rounded-md transition duration-200 ${activeTab === 'comparison' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} w-full sm:w-auto`}
              onClick={() => handleTabChange('comparison')}
            >
              {t("text-comparison-tab")}
            </button>
          </div>
        </div>
      }
      className="h-full"
    >
      {/* Mobile-only title - shows on small screens */}
      <div className="sm:hidden text-center mb-4">
        <div className="text-base font-medium text-gray-800">
          {getTabTitle(activeTab)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {getTabDescription(activeTab)}
        </div>
      </div>
      
      {/* Trends Chart */}
      {activeTab === 'trends' && (
        <SimpleBar>
          <div className="h-96 w-full pt-9">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 50, left: 30, bottom: 0 }}
                barGap={0}
                barCategoryGap={0}
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
                  label={{
                    value: selectedMetric === "mean_cpue" ? t('text-unit-kg-fisher-day') : 
                           selectedMetric === "mean_rpue" ? t('text-unit-kes-fisher-day') : 
                           selectedMetric === "mean_cost" ? t('text-unit-kes-fisher-day') : 
                           selectedMetric === "mean_profit" ? t('text-unit-kes-fisher-day') : 
                           t('text-unit-kg-fisher-day'),
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fontSize: 12, fill: '#666' }
                  }}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Tooltip content={<CustomTooltip />} />
                {/* Fisher's own data as bars */}
                <Bar
                  dataKey={selectedMetric === "mean_cpue" ? "cpue" : selectedMetric === "mean_rpue" ? "rpue" : selectedMetric === "mean_cost" ? "cost" : "profit"}
                  fill="#F79F79"
                  name="You"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                {/* Income baseline reference lines (only for RPUE) */}
                {selectedMetric === "mean_rpue" && (
                  <>
                    <ReferenceLine
                      y={BASELINE_DATA.INCOME.POVERTY_LINE}
                      stroke="#ef4444"
                      strokeDasharray="3 3"
                      strokeWidth={1.5}
                      label={{ value: t('text-poverty-line'), position: "insideBottomLeft", fill: "#ef4444", fontSize: 11, offset: 10 }}
                    />
                    <ReferenceLine
                      y={BASELINE_DATA.INCOME.NATIONAL_MINIMUM_WAGE}
                      stroke="#f59e0b"
                      strokeDasharray="3 3"
                      strokeWidth={1.5}
                      label={{ value: t('text-minimum-wage'), position: "insideLeft", fill: "#f59e0b", fontSize: 11, offset: 10 }}
                    />
                    <ReferenceLine
                      y={BASELINE_DATA.INCOME.LIVING_WAGE}
                      stroke="#22c55e"
                      strokeDasharray="3 3"
                      strokeWidth={1.5}
                      label={{ value: t('text-living-wage'), position: "insideTopLeft", fill: "#22c55e", fontSize: 11, offset: 10 }}
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
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SimpleBar>
      )}
      
      {/* Comparison Chart */}
      {activeTab === 'comparison' && (
        <SimpleBar>
          <div className="h-96 w-full pt-9">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                margin={{ top: 10, right: 50, left: 30, bottom: 0 }}
                barGap={0}
                barCategoryGap={0}
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
                  label={{
                    value: selectedMetric === "mean_cpue" ? t('text-unit-kg-fisher-day') : 
                           selectedMetric === "mean_rpue" ? t('text-unit-kes-fisher-day') : 
                           selectedMetric === "mean_cost" ? t('text-unit-kes-fisher-day') : 
                           selectedMetric === "mean_profit" ? t('text-unit-kes-fisher-day') : 
                           t('text-unit-kg-fisher-day'),
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fontSize: 12, fill: '#666' }
                  }}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <Tooltip content={<CustomTooltip />} />
                {/* Difference from average */}
                <Bar
                  dataKey="difference"
                  fill="#10b981"
                  name="Difference from Average"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                >
                  {comparisonData.map((entry, index) => {
                    // For costs, lower is better (green), higher is worse (red)
                    // For all other metrics, higher is better (green), lower is worse (red)
                    const isCostMetric = selectedMetric === "mean_cost";
                    const isPositiveDifference = entry.difference && entry.difference > 0;
                    const fillColor = isCostMetric 
                      ? (isPositiveDifference ? '#ef4444' : '#10b981') // Inverted for costs
                      : (isPositiveDifference ? '#10b981' : '#ef4444'); // Normal for others
                    
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={fillColor} 
                      />
                    );
                  })}
                </Bar>
                {/* Zero reference line */}
                <ReferenceLine
                  y={0}
                  stroke="#000"
                  strokeWidth={1}
                  label={{ value: '0', position: "right", fill: "#000", fontSize: 11 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SimpleBar>
      )}
    </WidgetCard>
  );
} 