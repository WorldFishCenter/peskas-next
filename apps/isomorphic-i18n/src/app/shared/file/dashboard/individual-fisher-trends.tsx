"use client";

import { useState, useMemo, useEffect } from "react";
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
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import cn from "@utils/class-names";
import { api } from "@/trpc/react";
import { getClientLanguage } from "@/app/i18n/language-link";

// Custom Y-axis tick component for consistent styling
function CustomYAxisTick({ x = 0, y = 0, payload = { value: 0 }, selectedMetric }: any) {
  let formattedValue = Number.isInteger(payload.value) && payload.value > 999
    ? payload.value.toLocaleString()
    : payload.value.toFixed(1);
    
  // Add KES for revenue and cost metrics
  if (selectedMetric === "fisher_rpue" || selectedMetric === "fisher_cost") {
    formattedValue = `${formattedValue}`;
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

export default function IndividualFisherTrends({ 
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
      countCpue: number;
      countRpue: number;
      countCost: number;
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
          countCpue: 0,
          countRpue: 0,
          countCost: 0,
        };
      }
      
      if (record.fisher_cpue != null) {
        dateGroups[dateKey].totalCpue += record.fisher_cpue;
        dateGroups[dateKey].countCpue++;
      }
      if (record.fisher_rpue != null) {
        dateGroups[dateKey].totalRpue += record.fisher_rpue;
        dateGroups[dateKey].countRpue++;
      }
      if (record.fisher_cost != null) {
        dateGroups[dateKey].totalCost += record.fisher_cost;
        dateGroups[dateKey].countCost++;
      }
    });
    
    // Calculate averages
    const averages: Record<string, { cpue?: number; rpue?: number; cost?: number }> = {};
    Object.entries(dateGroups).forEach(([date, totals]) => {
      averages[date] = {
        cpue: totals.countCpue > 0 ? totals.totalCpue / totals.countCpue : undefined,
        rpue: totals.countRpue > 0 ? totals.totalRpue / totals.countRpue : undefined,
        cost: totals.countCost > 0 ? totals.totalCost / totals.countCost : undefined,
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
          cpue: record.fisher_cpue ?? undefined,
          rpue: record.fisher_rpue ?? undefined,
          cost: record.fisher_cost ?? undefined,
          // BMU average data
          avgCpue: avgData.cpue,
          avgRpue: avgData.rpue,
          avgCost: avgData.cost,
          gear: record.gear ?? undefined,
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
              const color = isAverage ? "#6b7280" : COLORS[getMetricKey(selectedMetric)];
              
              return (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <p className="text-sm">
                    <span className="font-medium">
                      {isAverage ? `${fisherBMU} ${t('text-average')}` : t('text-your')} 
                      {selectedMetric === "fisher_cpue" && ` ${t('text-cpue')}`}
                      {selectedMetric === "fisher_rpue" && ` ${t('text-rpue')}`}
                      {selectedMetric === "fisher_cost" && ` ${t('text-cost')}`}:
                    </span>{" "}
                    <span className="font-semibold">
                      {selectedMetric === "fisher_cpue" && `${value.toFixed(2)} kg/trip`}
                      {selectedMetric === "fisher_rpue" && `KES ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      {selectedMetric === "fisher_cost" && `KES ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                  </p>
                </div>
              );
            })}
            {payload.length === 0 && (
              <p className="text-sm text-gray-500 italic">{t('text-no-data')}</p>
            )}
            {data.gear && (
              <p className="text-xs text-gray-500 mt-1 border-t pt-1">
                {data.gear} | {data.bmu}
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

  const getMetricKey = (metric: MetricType): keyof typeof COLORS => {
    return metric.replace("fisher_", "") as keyof typeof COLORS;
  };

  return (
          <WidgetCard
        title={t('text-your-daily-trends')}
        description={`${summaryStats.fishingDays} ${t('text-fishing-days')} (${summaryStats.totalDays} ${t('text-total-days')}) - ${t('text-compared-with-bmu-average', { bmu: fisherBMU })}`}
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
          {t('text-cpue')} {Number(summaryStats.avgCpue) > 0 && `(${summaryStats.avgCpue} ${t('text-average').toLowerCase()})`}
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
          {t('text-rpue')} {Number(summaryStats.avgRpue) > 0 && `(KES ${Number(summaryStats.avgRpue).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${t('text-average').toLowerCase()})`}
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
          {t('text-cost')} {Number(summaryStats.avgCost) > 0 && `(KES ${Number(summaryStats.avgCost).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${t('text-average').toLowerCase()})`}
        </button>
      </div>

      {/* Chart */}
      <div className="h-96 w-full pt-9">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
          >
            <XAxis
              dataKey="date"
              tickFormatter={(timestamp) => format(new Date(timestamp), "MMM dd")}
              tickMargin={10}
              minTickGap={20}
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
            
            <Line
              dataKey={selectedMetric === "fisher_cpue" ? "cpue" : selectedMetric === "fisher_rpue" ? "rpue" : "cost"}
              stroke={COLORS[getMetricKey(selectedMetric)]}
              strokeWidth={2}
              dot={{ fill: COLORS[getMetricKey(selectedMetric)], strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              connectNulls={false}
              isAnimationActive={false}
              name={t('text-your-performance')}
            />
            
            {/* BMU Average Line */}
            <Line
              dataKey={selectedMetric === "fisher_cpue" ? "avgCpue" : selectedMetric === "fisher_rpue" ? "avgRpue" : "avgCost"}
              stroke="#6b7280"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: "#6b7280", strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls={false}
              isAnimationActive={false}
              name={`${fisherBMU} ${t('text-average')}`}
            />
            
            {/* Legend */}
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="line"
              wrapperStyle={{ paddingTop: '10px' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  );
} 