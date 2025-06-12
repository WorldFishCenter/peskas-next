"use client";

import { useState, useMemo, useEffect } from "react";
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
  Legend,
} from "recharts";
import cn from "@utils/class-names";
import { api } from "@/trpc/react";
import { getClientLanguage } from "@/app/i18n/language-link";

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

export default function IndividualFisherGearPerformance({ 
  lang, 
  startDate, 
  endDate 
}: { 
  lang?: string;
  startDate?: Date | null;
  endDate?: Date;
}) {
  // Use client language instead of lang prop
  const clientLang = getClientLanguage();
  const { t, i18n } = useTranslation(clientLang);
  
  // Track current language with state
  const [currentLang, setCurrentLang] = useState(clientLang);
  
  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      setCurrentLang(event.detail.language);
      
      // Make sure i18n instance is updated
      if (i18n.language !== event.detail.language) {
        i18n.changeLanguage(event.detail.language);
      }
    };
    
    window.addEventListener('i18n-language-changed', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('i18n-language-changed', handleLanguageChange as EventListener);
    };
  }, [i18n]);
  
  const { userFisherId, isIiaUser } = useUserPermissions();
  const { fisherData, isLoadingFisherData } = useIndividualData({
    startDate,
    endDate
  });
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("fisher_cpue");

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
      {/* Metric selector */}
      <div className="flex justify-end gap-2 mb-4">
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

      {/* Comparison Chart */}
      <div className="h-96 w-full pt-9">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={comparisonData}
            margin={{ top: 40, right: 30, left: 10, bottom: 80 }}
          >
            <Legend verticalAlign="top" height={36} />
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
                  return `KES ${formatNumber(value)}`;
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
                            `KES ${data.yourValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          }
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">{fisherBMU} {t('text-average')}:</span> {
                            selectedMetric === "fisher_cpue" ? `${data.bmuAverage.toFixed(2)} kg/trip` :
                            `KES ${data.bmuAverage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
      </div>

      {/* Gear Performance Metrics */}
      <div className="mt-6 space-y-4">
        <h3 className="text-sm font-medium text-gray-700">{t('text-gear-performance-summary')}</h3>
        
        {comparisonData.map((gear) => {
          const percentDiff = gear.bmuAverage > 0 
            ? ((gear.yourValue - gear.bmuAverage) / gear.bmuAverage * 100)
            : 0;
          
          const isPerformingBetter = selectedMetric === 'fisher_cost' 
            ? percentDiff < 0 
            : percentDiff > 0;
          
          return (
            <div 
              key={gear.name}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <div 
                  className={cn(
                    "w-2 h-12 rounded-full",
                    isPerformingBetter ? "bg-green-500" : "bg-red-500"
                  )}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{gear.name}</p>
                  <p className="text-xs text-gray-500">
                    {gearPerformanceData.find(g => g.name === gear.name)?.trips || 0} {t('text-trips')}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {selectedMetric === "fisher_cpue" 
                    ? `${gear.yourValue.toFixed(2)} kg/trip`
                    : `KES ${gear.yourValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                  }
                </p>
                <p className={cn(
                  "text-xs font-medium",
                  isPerformingBetter ? "text-green-600" : "text-red-600"
                )}>
                  {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}% 
                  {' '}
                  {selectedMetric === 'fisher_cost' 
                    ? (percentDiff < 0 ? t('text-lower') : t('text-higher'))
                    : (percentDiff > 0 ? t('text-higher') : t('text-lower'))
                  }
                </p>
              </div>
            </div>
          );
        })}
        
        {/* Overall summary */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700">
            <span className="font-medium">{t('text-total-fishing-trips')}:</span> {gearPerformanceData.reduce((sum, item) => sum + item.trips, 0)}
            {' • '}
            <span className="font-medium">{t('text-gear-types-used')}:</span> {gearPerformanceData.length}
          </p>
        </div>
      </div>
    </WidgetCard>
  );
} 