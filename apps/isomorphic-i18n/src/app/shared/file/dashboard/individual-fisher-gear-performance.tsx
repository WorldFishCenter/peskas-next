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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import cn from "@utils/class-names";
import { api } from "@/trpc/react";

const GEAR_COLORS: Record<string, string> = {
  handline: "#3b82f6", // blue
  speargun: "#10b981", // green  
  gillnet: "#f59e0b", // amber
  "hook and stick": "#8b5cf6", // purple
  trap: "#ef4444", // red
  other: "#6b7280", // gray
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
  if (!gear || gear === "NA") return "Unknown";
  return gear
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

type MetricType = "fisher_cpue" | "fisher_rpue" | "fisher_cost";

export default function IndividualFisherGearPerformance({ lang }: { lang?: string }) {
  const { t } = useTranslation("common");
  const { userFisherId, isIiaUser } = useUserPermissions();
  const { fisherData, isLoadingFisherData } = useIndividualData();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("fisher_cpue");
  const [viewType, setViewType] = useState<"bar" | "pie" | "comparison">("bar");

  // Get fisher's BMU
  const fisherBMU = useMemo(() => {
    if (!fisherData || fisherData.length === 0) return null;
    return fisherData[0]?.BMU;
  }, [fisherData]);

  // Fetch all data for the fisher's BMU
  const { data: bmuData, isLoading: isLoadingBmuData } = api.individualData.all.useQuery(
    { bmus: fisherBMU ? [fisherBMU] : [] },
    { enabled: !!fisherBMU }
  );

  // Only render for IIA users
  if (!isIiaUser || !userFisherId) {
    return null;
  }

  // Process data by gear type
  const gearPerformanceData = useMemo(() => {
    if (!fisherData || fisherData.length === 0) return [];

    // Group data by gear type
    const gearGroups = fisherData.reduce((acc, record) => {
      if (!record.gear || record.gear === "NA") return acc;
      
      const gear = record.gear.toLowerCase();
      if (!acc[gear]) {
        acc[gear] = {
          gear: gear,
          trips: 0,
          totalCpue: 0,
          totalRpue: 0,
          totalCost: 0,
          validCpueCount: 0,
          validRpueCount: 0,
          validCostCount: 0,
        };
      }

      acc[gear].trips++;
      
      if (record.fisher_cpue != null) {
        acc[gear].totalCpue += record.fisher_cpue;
        acc[gear].validCpueCount++;
      }
      
      if (record.fisher_rpue != null) {
        acc[gear].totalRpue += record.fisher_rpue;
        acc[gear].validRpueCount++;
      }
      
      if (record.fisher_cost != null) {
        acc[gear].totalCost += record.fisher_cost;
        acc[gear].validCostCount++;
      }

      return acc;
    }, {} as Record<string, any>);

    // Calculate averages and format for chart
    return Object.values(gearGroups)
      .map((group: any) => ({
        name: capitalizeGearType(group.gear),
        gear: group.gear,
        trips: group.trips,
        avgCpue: group.validCpueCount > 0 ? group.totalCpue / group.validCpueCount : 0,
        avgRpue: group.validRpueCount > 0 ? group.totalRpue / group.validRpueCount : 0,
        avgCost: group.validCostCount > 0 ? group.totalCost / group.validCostCount : 0,
        totalRevenue: group.totalRpue,
        totalCost: group.totalCost,
        netProfit: group.totalRpue - group.totalCost,
      }))
      .sort((a, b) => b[selectedMetric === "fisher_cpue" ? "avgCpue" : selectedMetric === "fisher_rpue" ? "avgRpue" : "avgCost"] - 
                       a[selectedMetric === "fisher_cpue" ? "avgCpue" : selectedMetric === "fisher_rpue" ? "avgRpue" : "avgCost"]);
  }, [fisherData, selectedMetric]);

  // Calculate BMU average gear performance (excluding current fisher)
  const bmuGearPerformance = useMemo(() => {
    if (!bmuData || !userFisherId) return [];

    const otherFishersData = bmuData.filter(record => record.fisher_id !== userFisherId);
    
    // Group by gear type
    const gearGroups = otherFishersData.reduce((acc, record) => {
      if (!record.gear || record.gear === "NA") return acc;
      
      const gear = record.gear.toLowerCase();
      if (!acc[gear]) {
        acc[gear] = {
          gear: gear,
          trips: 0,
          totalCpue: 0,
          totalRpue: 0,
          totalCost: 0,
          validCpueCount: 0,
          validRpueCount: 0,
          validCostCount: 0,
        };
      }

      acc[gear].trips++;
      
      if (record.fisher_cpue != null) {
        acc[gear].totalCpue += record.fisher_cpue;
        acc[gear].validCpueCount++;
      }
      
      if (record.fisher_rpue != null) {
        acc[gear].totalRpue += record.fisher_rpue;
        acc[gear].validRpueCount++;
      }
      
      if (record.fisher_cost != null) {
        acc[gear].totalCost += record.fisher_cost;
        acc[gear].validCostCount++;
      }

      return acc;
    }, {} as Record<string, any>);

    // Calculate averages
    return Object.values(gearGroups).map((group: any) => ({
      name: capitalizeGearType(group.gear),
      gear: group.gear,
      avgCpue: group.validCpueCount > 0 ? group.totalCpue / group.validCpueCount : 0,
      avgRpue: group.validRpueCount > 0 ? group.totalRpue / group.validRpueCount : 0,
      avgCost: group.validCostCount > 0 ? group.totalCost / group.validCostCount : 0,
    }));
  }, [bmuData, userFisherId]);

  // Create comparison data
  const comparisonData = useMemo(() => {
    if (!gearPerformanceData || !bmuGearPerformance) return [];

    return gearPerformanceData.map(fisherGear => {
      const bmuGear = bmuGearPerformance.find(bg => bg.gear === fisherGear.gear);
      const metricKey = selectedMetric === "fisher_cpue" ? "avgCpue" : 
                       selectedMetric === "fisher_rpue" ? "avgRpue" : "avgCost";
      
      return {
        name: fisherGear.name,
        yourValue: fisherGear[metricKey],
        bmuAverage: bmuGear ? bmuGear[metricKey] : 0,
        difference: fisherGear[metricKey] - (bmuGear ? bmuGear[metricKey] : 0),
      };
    });
  }, [gearPerformanceData, bmuGearPerformance, selectedMetric]);

  // Prepare data for pie chart
  const pieData = useMemo(() => {
    const metricKey = selectedMetric === "fisher_cpue" ? "avgCpue" : 
                     selectedMetric === "fisher_rpue" ? "avgRpue" : "avgCost";
    
    return gearPerformanceData
      .filter(item => item[metricKey] > 0)
      .map(item => ({
        name: item.name,
        value: item[metricKey],
      }));
  }, [gearPerformanceData, selectedMetric]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-600 mb-2">{data.name}</p>
          <div className="space-y-1.5">
            <p className="text-sm">
              <span className="font-medium">{t('text-trips')}:</span> {data.trips}
            </p>
            <p className="text-sm">
              <span className="font-medium">{t('text-avg-cpue')}:</span> {data.avgCpue.toFixed(2)} kg/trip
            </p>
            <p className="text-sm">
              <span className="font-medium">{t('text-avg-revenue')}:</span> ${data.avgRpue.toFixed(2)}
            </p>
            <p className="text-sm">
              <span className="font-medium">{t('text-avg-cost')}:</span> ${data.avgCost.toFixed(2)}
            </p>
            <p className="text-sm font-semibold">
              <span className="font-medium">{t('text-net-profit')}:</span> ${data.netProfit.toFixed(2)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / pieData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1);
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-600 mb-2">{data.name}</p>
          <p className="text-sm">
            <span className="font-medium">
              {selectedMetric === "fisher_cpue" && `${t('text-avg-cpue')}: `}
              {selectedMetric === "fisher_rpue" && `${t('text-avg-revenue')}: `}
              {selectedMetric === "fisher_cost" && `${t('text-avg-cost')}: `}
            </span>
            <span className="font-semibold">
              {selectedMetric === "fisher_cpue" && `${data.value.toFixed(2)} kg/trip`}
              {selectedMetric === "fisher_rpue" && `$${data.value.toFixed(2)}`}
              {selectedMetric === "fisher_cost" && `$${data.value.toFixed(2)}`}
            </span>
          </p>
          <p className="text-sm text-gray-500">{percentage}% {t('text-of-total')}</p>
        </div>
      );
    }
    return null;
  };

  if (isLoadingFisherData || isLoadingBmuData) {
    return (
      <WidgetCard
        title={t('text-your-gear-performance')}
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

  if (!gearPerformanceData || gearPerformanceData.length === 0) {
    return (
      <WidgetCard
        title={t('text-your-gear-performance')}
        className="h-full"
      >
        <div className="h-96 w-full flex items-center justify-center">
          <p className="text-gray-500">{t('text-no-gear-data')}</p>
        </div>
      </WidgetCard>
    );
  }



  return (
    <WidgetCard
      title={t('text-your-gear-performance')}
      description={t('text-gear-performance-description')}
      headerClassName="pb-2"
    >
      {/* View type and metric selector */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setViewType("bar")}
            className={cn(
              "px-3 py-2 rounded-md text-xs font-medium transition-colors",
              viewType === "bar"
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {t('text-bar-chart')}
          </button>
          <button
            onClick={() => setViewType("pie")}
            className={cn(
              "px-3 py-2 rounded-md text-xs font-medium transition-colors",
              viewType === "pie"
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {t('text-pie-chart')}
          </button>
          <button
            onClick={() => setViewType("comparison")}
            className={cn(
              "px-3 py-2 rounded-md text-xs font-medium transition-colors",
              viewType === "comparison"
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {t('text-compare-with')} {fisherBMU}
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setSelectedMetric("fisher_cpue")}
            className={cn(
              "px-3 py-2 rounded-md text-xs font-medium transition-colors",
              selectedMetric === "fisher_cpue"
                ? "bg-blue-100 text-blue-700 border-blue-200 border"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {t('text-cpue')}
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
            {t('text-rpue')}
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
            {t('text-cost')}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96 w-full pt-9">
        {viewType === "bar" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={gearPerformanceData}
              margin={{ top: 10, right: 30, left: 10, bottom: 60 }}
            >
              <XAxis
                dataKey="name"
                tickMargin={10}
                axisLine={false}
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
              />
              <YAxis
                axisLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  if (selectedMetric !== "fisher_cpue") {
                    return `$${formatNumber(value)}`;
                  }
                  return formatNumber(value);
                }}
              />
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <Tooltip content={<CustomTooltip />} />
              
              <Bar
                dataKey={
                  selectedMetric === "fisher_cpue" ? "avgCpue" :
                  selectedMetric === "fisher_rpue" ? "avgRpue" : "avgCost"
                }
                fill={
                  selectedMetric === "fisher_cpue" ? "#3b82f6" :
                  selectedMetric === "fisher_rpue" ? "#10b981" : "#f59e0b"
                }
                isAnimationActive={false}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : viewType === "pie" ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                isAnimationActive={false}
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={GEAR_COLORS[entry.name.toLowerCase()] || GEAR_COLORS.other} 
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => value}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : viewType === "comparison" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={comparisonData}
              margin={{ top: 10, right: 30, left: 10, bottom: 60 }}
            >
              <XAxis
                dataKey="name"
                tickMargin={10}
                axisLine={false}
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
              />
              <YAxis
                axisLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  if (selectedMetric !== "fisher_cpue") {
                    return `$${formatNumber(value)}`;
                  }
                  return formatNumber(value);
                }}
              />
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const percentDiff = data.bmuAverage > 0 
                      ? ((data.yourValue - data.bmuAverage) / data.bmuAverage * 100).toFixed(1)
                      : null;
                    
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                        <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
                        <div className="space-y-1.5">
                          <p className="text-sm">
                            <span className="font-medium">{t('text-your-average')}:</span> {
                              selectedMetric === "fisher_cpue" ? `${data.yourValue.toFixed(2)} kg/trip` :
                              `$${data.yourValue.toFixed(2)}`
                            }
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">{fisherBMU} {t('text-average')}:</span> {
                              selectedMetric === "fisher_cpue" ? `${data.bmuAverage.toFixed(2)} kg/trip` :
                              `$${data.bmuAverage.toFixed(2)}`
                            }
                          </p>
                          {percentDiff !== null && (
                            <p className={cn(
                              "text-sm font-semibold",
                              data.difference > 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {data.difference > 0 ? '+' : ''}{percentDiff}% {
                                selectedMetric === 'fisher_cost' 
                                  ? (data.difference < 0 ? t('text-better') : t('text-higher'))
                                  : (data.difference > 0 ? t('text-better') : t('text-lower'))
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              
              <Bar
                dataKey="yourValue"
                name={t('text-your-performance')}
                fill={
                  selectedMetric === "fisher_cpue" ? "#3b82f6" :
                  selectedMetric === "fisher_rpue" ? "#10b981" : "#f59e0b"
                }
                isAnimationActive={false}
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="bmuAverage"
                name={`${fisherBMU} ${t('text-average')}`}
                fill="#6b7280"
                isAnimationActive={false}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </div>

      {/* Summary stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">{t('text-total-gear-types')}</p>
            <p className="text-lg font-semibold">{gearPerformanceData.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">{t('text-most-used-gear')}</p>
            <p className="text-lg font-semibold">
              {gearPerformanceData.sort((a, b) => b.trips - a.trips)[0]?.name || "-"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">{t('text-most-profitable-gear')}</p>
            <p className="text-lg font-semibold">
              {gearPerformanceData.sort((a, b) => b.netProfit - a.netProfit)[0]?.name || "-"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">{t('text-total-trips')}</p>
            <p className="text-lg font-semibold">
              {gearPerformanceData.reduce((sum, item) => sum + item.trips, 0)}
            </p>
          </div>
        </div>
      </div>
    </WidgetCard>
  );
} 