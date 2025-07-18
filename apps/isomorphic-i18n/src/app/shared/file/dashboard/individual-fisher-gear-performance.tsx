"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import { useAtom } from 'jotai';
import { selectedTimeRangeAtom } from "@/app/components/filter-selector";
import { getTimeRangeStartDate } from "./utils/timeRangeFilter";
import GearPerformanceBarChart from "./GearPerformanceBarChart";
import GearPerformanceCard from "./GearPerformanceCard";

const COLORS = {
  blue: "#3b82f6",
  green: "#10b981",
  amber: "#f59e0b",
  orange: "#f97316",
  purple: "#9333ea",
};

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
  const [selectedTimeRange] = useAtom(selectedTimeRangeAtom);
  
  // Calculate date range based on selected time range
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = getTimeRangeStartDate(selectedTimeRange, endDate);
    return { startDate, endDate };
  }, [selectedTimeRange]);
  
  const { fisherData, isLoadingFisherData } = useIndividualData(dateRange);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("fisher_cpue");

  // Get fisher's BMU
  const fisherBMU = useMemo(() => {
    if (!fisherData || fisherData.length === 0) return null;
    return fisherData[0]?.BMU;
  }, [fisherData]);

  // Fetch gear stats for the current fisher
  const { data: fisherGearData, isLoading: isLoadingFisherGear } = api.individualGearData.byFisher.useQuery(
    { fisher_id: userFisherId || '' },
    { enabled: isIiaUser && !!userFisherId }
  );

  // Fetch BMU average gear stats (excluding current fisher)
  const { data: bmuGearData, isLoading: isLoadingBmuGear } = api.individualGearData.bmuAverage.useQuery(
    { BMU: fisherBMU || '', excludeFisherId: userFisherId || '' },
    { enabled: isIiaUser && !!userFisherId && !!fisherBMU }
  );

  // Aggregate gear data by gear type for the selected time range
  const aggregatedGearPerformanceData = useMemo(() => {
    if (!fisherGearData) return [];
    // Group by gear and average the selected metric
    const grouped = fisherGearData.reduce((acc: any, record: any) => {
      const gear = record.gear;
      if (!acc[gear]) {
        acc[gear] = { count: 0, sumCpue: 0, sumRpue: 0, sumCost: 0, sumProfit: 0 };
      }
      acc[gear].count++;
      acc[gear].sumCpue += record.mean_cpue;
      acc[gear].sumRpue += record.mean_rpue;
      acc[gear].sumCost += record.mean_costs;
      acc[gear].sumProfit += record.mean_profit;
      return acc;
    }, {});
    return Object.entries(grouped).map(([gear, stats]: any) => ({
      gear,
      name: capitalizeGearType(gear),
      avgCpue: stats.sumCpue / stats.count,
      avgRpue: stats.sumRpue / stats.count,
      avgCost: stats.sumCost / stats.count,
      avgProfit: stats.sumProfit / stats.count,
      trips: stats.count,
    }));
  }, [fisherGearData]);

  const aggregatedBmuGearPerformance = useMemo(() => {
    if (!bmuGearData) return [];
    // Group by gear and average
    const grouped = bmuGearData.reduce((acc: any, record: any) => {
      const gear = record.gear;
      if (!acc[gear]) {
        acc[gear] = { count: 0, sumCpue: 0, sumRpue: 0, sumCost: 0, sumProfit: 0 };
      }
      acc[gear].count++;
      acc[gear].sumCpue += record.mean_cpue;
      acc[gear].sumRpue += record.mean_rpue;
      acc[gear].sumCost += record.mean_costs;
      acc[gear].sumProfit += record.mean_profit;
      return acc;
    }, {});
    return Object.entries(grouped).map(([gear, stats]: any) => ({
      gear,
      avgCpue: stats.sumCpue / stats.count,
      avgRpue: stats.sumRpue / stats.count,
      avgCost: stats.sumCost / stats.count,
      avgProfit: stats.sumProfit / stats.count,
    }));
  }, [bmuGearData]);

  // Prepare chart data: one bar per gear
  const chartData = useMemo(() => {
    return aggregatedGearPerformanceData.map(fisherGear => {
      const bmuGear = aggregatedBmuGearPerformance.find(bg => bg.gear === fisherGear.gear);
      return {
        name: capitalizeGearType(fisherGear.gear),
        yourValue: selectedMetric === "fisher_cpue" ? fisherGear.avgCpue :
                  selectedMetric === "fisher_rpue" ? fisherGear.avgRpue :
                  selectedMetric === "fisher_cost" ? fisherGear.avgCost :
                  fisherGear.avgProfit,
        bmuAverage: bmuGear ? (
          selectedMetric === "fisher_cpue" ? bmuGear.avgCpue :
          selectedMetric === "fisher_rpue" ? bmuGear.avgRpue :
          selectedMetric === "fisher_cost" ? bmuGear.avgCost :
          bmuGear.avgProfit
        ) : 0,
        difference: (selectedMetric === "fisher_cpue" ? fisherGear.avgCpue :
                    selectedMetric === "fisher_rpue" ? fisherGear.avgRpue :
                    selectedMetric === "fisher_cost" ? fisherGear.avgCost :
                    fisherGear.avgProfit)
                  - (bmuGear ? (
                      selectedMetric === "fisher_cpue" ? bmuGear.avgCpue :
                      selectedMetric === "fisher_rpue" ? bmuGear.avgRpue :
                      selectedMetric === "fisher_cost" ? bmuGear.avgCost :
                      bmuGear.avgProfit
                    ) : 0),
        trips: fisherGear.trips,
      };
    });
  }, [aggregatedGearPerformanceData, aggregatedBmuGearPerformance, selectedMetric]);

  // Only render for IIA users
  if (!isIiaUser || !userFisherId) {
    return null;
  }

  if (isLoadingFisherGear || isLoadingBmuGear) {
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

  if (!aggregatedGearPerformanceData || aggregatedGearPerformanceData.length === 0) {
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

  // Metric selector options (match trends)
  const METRIC_OPTIONS = [
    { key: 'fisher_cpue', label: 'text-cpue', color: '#3b82f6', unit: 'kg/trip' },
    { key: 'fisher_rpue', label: 'text-rpue', color: '#10b981', unit: 'KES/trip' },
    { key: 'fisher_cost', label: 'text-costs', color: '#f59e0b', unit: 'KES/trip' },
    { key: 'netProfit', label: 'text-profit', color: '#f97316', unit: 'KES/trip' },
  ];

  // Final refactor: two separate elements, one WidgetCard for the chart, one column for the gear cards
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
      {/* Chart section in its own WidgetCard */}
      <div className="lg:col-span-9 col-span-1">
        <WidgetCard
          title={t('text-your-gear-performance')}
          description={t('text-gear-performance-description')}
          headerClassName="pb-2"
        >
          <GearPerformanceBarChart
            data={chartData}
            selectedMetric={selectedMetric}
            setSelectedMetric={(metric: string) => setSelectedMetric(metric as MetricType)}
            t={t}
            METRIC_OPTIONS={METRIC_OPTIONS}
            bmuName={fisherBMU}
          />
        </WidgetCard>
      </div>
      {/* Cards section: plain stacked cards, not in a WidgetCard */}
      <div className="lg:col-span-3 col-span-1 flex flex-col gap-6">
        {chartData.map((gear) => (
          <GearPerformanceCard
            key={gear.name}
            gear={gear}
            selectedMetric={selectedMetric}
            t={t}
            bmuName={fisherBMU}
          />
        ))}
      </div>
    </div>
  );
} 