"use client";

import { Text, Title } from "rizzui";
import { useTranslation } from "@/app/i18n/client";
import { useIndividualData } from "./hooks/useIndividualData";
import { useUserPermissions } from "./hooks/useUserPermissions";
import cn from "@utils/class-names";
import { PiTrendUp, PiTrendDown, PiEquals } from "react-icons/pi";
import { api } from "@/trpc/react";
import { useMemo, useEffect, useState } from "react";
import { getClientLanguage } from "@/app/i18n/language-link";
import { BASELINE_DATA } from "./charts/siteConfig";
import { useAtom } from 'jotai';
import { selectedTimeRangeAtom } from "@/app/components/filter-selector";
import { getTimeRangeStartDate } from "./utils/timeRangeFilter";

export default function IndividualFisherStats({ 
  lang, 
  startDate, 
  endDate 
}: { 
  lang?: string;
  startDate?: Date | null;
  endDate?: Date;
}) {
  const { t } = useTranslation("common");
  const [selectedTimeRange] = useAtom(selectedTimeRangeAtom);
  
  // Calculate date range based on selected time range
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = getTimeRangeStartDate(selectedTimeRange, endDate);
    return { startDate, endDate };
  }, [selectedTimeRange]);
  
  const { fisherPerformanceSummary, isLoadingFisherSummary, fisherData } = useIndividualData(dateRange);

  // Use client language instead of lang prop
  const clientLang = getClientLanguage();
  const { i18n } = useTranslation(clientLang);
  
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

  // Get fisher's BMU from their data
  const fisherBMU = useMemo(() => {
    if (!fisherData || fisherData.length === 0) return null;
    return fisherData[0]?.BMU;
  }, [fisherData]);

  // Fetch all data for the fisher's BMU to calculate averages
  const { data: bmuData, isLoading: isLoadingBmuData } = api.individualData.all.useQuery(
    { bmus: fisherBMU ? [fisherBMU] : [] },
    { enabled: !!fisherBMU }
  );

  // Calculate BMU averages (excluding current fisher)
  const bmuAverages = useMemo(() => {
    if (!bmuData || !userFisherId) return null;
    
    const otherFishersData = bmuData.filter(record => record.fisher_id !== userFisherId);
    if (otherFishersData.length === 0) return null;

    const cpueValues = otherFishersData.filter(d => d.mean_cpue != null).map(d => d.mean_cpue);
    const rpueValues = otherFishersData.filter(d => d.mean_rpue != null).map(d => d.mean_rpue);
    const costValues = otherFishersData.filter(d => d.mean_costs != null).map(d => d.mean_costs);
    const profitValues = otherFishersData.filter(d => d.mean_profit != null).map(d => d.mean_profit);

    return {
      avgCpue: cpueValues.length > 0 ? cpueValues.reduce((a, b) => a + b, 0) / cpueValues.length : 0,
      avgRpue: rpueValues.length > 0 ? rpueValues.reduce((a, b) => a + b, 0) / rpueValues.length : 0,
      avgCost: costValues.length > 0 ? costValues.reduce((a, b) => a + b, 0) / costValues.length : 0,
      avgProfit: profitValues.length > 0 ? profitValues.reduce((a, b) => a + b, 0) / profitValues.length : 0,
    };
  }, [bmuData, userFisherId]);

  // Calculate net profit BMU average - MUST be before any conditional returns
  const bmuNetProfit = useMemo(() => {
    if (!bmuAverages) return null;
    return bmuAverages.avgProfit;
  }, [bmuAverages]);

  const summary = fisherPerformanceSummary?.[0] || {};

  // Helper function to format currency with KES and commas
  const formatCurrency = (val: number) => {
    return `KES ${val.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // Helper function to format numbers with commas
  const formatNumber = (val: number, decimals: number = 2) => {
    return val.toLocaleString('en-US', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
  };

  const getPerformanceStatus = (fisherValue: number, bmuAvg: number | null, metric: string) => {
    // For net profit, compare with BMU average if available
    if (metric === 'profit' && bmuAvg !== null && bmuAvg !== 0) {
      const percentDiff = ((fisherValue - bmuAvg) / Math.abs(bmuAvg)) * 100;
      if (percentDiff > 5) return 'up';
      if (percentDiff < -5) return 'down';
      return 'neutral';
    }
    
    // For net profit without BMU average, use absolute value logic
    if (metric === 'profit') {
      if (fisherValue > 100) return 'up';
      if (fisherValue < -100) return 'down';
      return 'neutral';
    }
    
    if (!bmuAvg || bmuAvg === 0) return 'neutral';
    const percentDiff = ((fisherValue - bmuAvg) / bmuAvg) * 100;
    
    // For cost, lower is better (reversed logic)
    if (metric === 'cost') {
      if (percentDiff < -5) return 'up';  // More than 5% lower is good
      if (percentDiff > 5) return 'down';  // More than 5% higher is bad
      return 'neutral';
    }
    
    // For other metrics (CPUE, RPUE), higher is better
    if (percentDiff > 5) return 'up';  // More than 5% higher is good
    if (percentDiff < -5) return 'down';  // More than 5% lower is bad
    return 'neutral';
  };

  // Only render for IIA users
  if (!isIiaUser || !userFisherId) {
    return null;
  }

  if (isLoadingFisherSummary || isLoadingBmuData) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-6">
            <div className="space-y-3">
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-8 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: t('text-cpue'),
      value: summary.avg_cpue || 0,
      bmuAvg: bmuAverages?.avgCpue || 0,
      format: (val: number) => `${formatNumber(val)} kg/trip`,
      trend: getPerformanceStatus(summary.avg_cpue || 0, bmuAverages?.avgCpue || 0, 'cpue'),
      color: 'blue' as const,
      metric: 'cpue',
      description: t('text-average-catch-per-trip'),
    },
    {
      title: t('text-rpue'),
      value: summary.avg_rpue || 0,
      bmuAvg: bmuAverages?.avgRpue || 0,
      format: formatCurrency,
      trend: getPerformanceStatus(summary.avg_rpue || 0, bmuAverages?.avgRpue || 0, 'rpue'),
      color: 'green' as const,
      metric: 'rpue',
      description: t('text-average-revenue-per-trip'),
    },
    {
      title: t('text-cost'),
      value: summary.avg_costs || 0,
      bmuAvg: bmuAverages?.avgCost || 0,
      format: formatCurrency,
      trend: getPerformanceStatus(summary.avg_costs || 0, bmuAverages?.avgCost || 0, 'cost'),
      color: 'purple' as const,
      metric: 'cost',
      description: t('text-average-cost-per-trip'),
    },
    {
      title: t('text-net-profit'),
      value: summary.avg_profit || 0,
      bmuAvg: bmuNetProfit,
      format: formatCurrency,
      trend: getPerformanceStatus(summary.avg_profit || 0, bmuNetProfit, 'profit'),
      color: 'orange' as const,
      metric: 'profit',
      description: t('text-average-profit-per-trip'),
    },
  ];

  const getTrendIcon = (trend: string, metric?: string) => {
    // For cost metric, colors are reversed (up is bad, down is good)
    const isGoodTrend = metric === 'cost' 
      ? trend === 'down' 
      : trend === 'up';
    
    switch (trend) {
      case 'up':
        return <PiTrendUp className={cn("h-5 w-5", isGoodTrend ? "text-green-500" : "text-red-500")} />;
      case 'down':
        return <PiTrendDown className={cn("h-5 w-5", !isGoodTrend ? "text-green-500" : "text-red-500")} />;
      default:
        return <PiEquals className="h-5 w-5 text-gray-500" />;
    }
  };

  const getCardColors = (color: string) => {
    const colors = {
      blue: 'border-blue-200 bg-blue-50',
      green: 'border-green-200 bg-green-50',
      purple: 'border-purple-200 bg-purple-50',
      orange: 'border-orange-200 bg-orange-50',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  // Calculate daily income from RPUE (assuming one trip per day)
  const dailyIncome = summary.avg_rpue || 0;
  
  // Income comparison helpers
  const incomeComparisons = [
    { 
      label: t('text-poverty-line'), 
      value: BASELINE_DATA.INCOME.POVERTY_LINE,
      color: dailyIncome >= BASELINE_DATA.INCOME.POVERTY_LINE ? 'green' : 'red'
    },
    { 
      label: t('text-minimum-wage'), 
      value: BASELINE_DATA.INCOME.NATIONAL_MINIMUM_WAGE,
      color: dailyIncome >= BASELINE_DATA.INCOME.NATIONAL_MINIMUM_WAGE ? 'green' : 'orange'
    },
    { 
      label: t('text-living-wage'), 
      value: BASELINE_DATA.INCOME.LIVING_WAGE,
      color: dailyIncome >= BASELINE_DATA.INCOME.LIVING_WAGE ? 'green' : 'orange'
    }
  ];

  return (
    <div className="space-y-5">
      {/* Income baseline indicators */}
      {/* <WidgetCard
        title={t('text-income-indicators')}
        description={t('text-daily-income-comparison')}
        headerClassName="pb-3"
      >
        <div className="grid grid-cols-3 gap-4">
          {incomeComparisons.map((comparison, index) => (
            <div key={index} className="text-center">
              <Text className="text-xs text-gray-500 mb-1">{comparison.label}</Text>
              <Text className="text-sm font-medium">{formatCurrency(comparison.value)}</Text>
              <div className="mt-2">
                <div className={cn(
                  "w-3 h-3 rounded-full mx-auto",
                  comparison.color === 'green' ? "bg-green-500" : 
                  comparison.color === 'orange' ? "bg-orange-500" : 
                  "bg-red-500"
                )} />
                <Text className="text-xs mt-1">
                  {comparison.color === 'green' ? t('text-above') : t('text-below')}
                </Text>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <Text className="text-sm text-gray-600 text-center">
            {t('text-your-daily-income')}: <span className="font-semibold">{formatCurrency(dailyIncome)}</span>
          </Text>
        </div>
      </WidgetCard> */}

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const percentDiff = stat.bmuAvg !== null && stat.bmuAvg !== 0
            ? ((stat.value - stat.bmuAvg) / stat.bmuAvg * 100)
            : null;

          // Consistent performance logic
          let isBetter = false;
          if (stat.metric === 'cost') {
            isBetter = percentDiff !== null && percentDiff < 0; // Lower cost is better
          } else {
            isBetter = percentDiff !== null && percentDiff > 0; // Higher is better
          }

          // Consistent trend for arrow
          let trend: 'up' | 'down' | 'neutral' = 'neutral';
          if (percentDiff !== null) {
            if (percentDiff > 2) trend = stat.metric === 'cost' ? 'down' : 'up';
            else if (percentDiff < -2) trend = stat.metric === 'cost' ? 'up' : 'down';
            else trend = 'neutral';
          }

          // Card border color
          let borderColor = 'border-gray-200';
          if (trend === 'up' && isBetter) borderColor = 'border-green-200';
          else if (trend === 'down' && !isBetter) borderColor = 'border-red-200';

          // Progress bar fill: 50% at average, 100% at double average, 0% at zero (or double worse)
          let barFill = 50;
          if (stat.bmuAvg && stat.bmuAvg !== 0) {
            let ratio = stat.value / stat.bmuAvg;
            if (stat.metric === 'cost') ratio = stat.bmuAvg / stat.value; // Invert for cost
            barFill = Math.max(0, Math.min(100, ratio * 50));
          }

          return (
            <div
              key={index}
              className={cn(
                "rounded-lg border p-5 relative bg-white shadow-sm hover:shadow-md transition-shadow",
                borderColor
              )}
            >
              {/* Header with title and trend */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <Text className="text-sm font-medium text-gray-700">
                    {stat.title}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {stat.description}
                  </Text>
                </div>
                <div className="ml-2">
                  {trend === 'up' && <PiTrendUp className="h-5 w-5 text-green-500" />}
                  {trend === 'down' && <PiTrendDown className="h-5 w-5 text-red-500" />}
                  {trend === 'neutral' && <PiEquals className="h-5 w-5 text-gray-500" />}
                </div>
              </div>
              {/* Main value */}
              <div className="mb-4">
                <Text className="text-2xl font-bold text-gray-900">
                  {stat.format(stat.value)}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  {t('text-your-average')}
                </Text>
              </div>
              {/* BMU comparison with visual indicator */}
              {stat.bmuAvg !== null && (
                <div className="space-y-2">
                  {/* Comparison bar */}
                  <div className="relative">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <Text className="text-gray-500">{fisherBMU} {t('text-average')}:</Text>
                      <Text className="font-medium text-gray-700">
                        {stat.format(stat.bmuAvg)}
                      </Text>
                    </div>
                    {/* Visual comparison indicator */}
                    {percentDiff !== null && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <Text className={cn(
                            "text-sm font-semibold",
                            isBetter ? "text-green-600" : percentDiff === 0 ? "text-gray-600" : "text-red-600"
                          )}>
                            {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
                          </Text>
                          <Text className={cn(
                            "text-xs",
                            isBetter ? "text-green-600" : percentDiff === 0 ? "text-gray-500" : "text-red-600"
                          )}>
                            {isBetter ? (stat.metric === 'cost' ? t('text-lower-than-average') : t('text-higher-than-average')) : 
                             percentDiff === 0 ? t('text-same-as-average') : 
                             (stat.metric === 'cost' ? t('text-higher-than-average') : t('text-lower-than-average'))}
                          </Text>
                        </div>
                        {/* Diverging progress bar showing relative performance */}
                        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden relative flex items-center">
                          {/* Center reference line and label */}
                          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gray-800 z-20" style={{height: '150%'}} />
                          <div className="absolute left-1/2 -top-4 z-30 text-xs font-semibold text-gray-800 select-none" style={{transform: 'translateX(-50%)'}}>
                            Avg
                          </div>
                          {/* Diverging fill logic */}
                          {percentDiff !== null && stat.metric === 'cost' && percentDiff < 0 && (
                            <div
                              className="h-full bg-green-500 transition-all duration-500 z-0 rounded-l-full"
                              style={{
                                width: `${Math.min(Math.abs(percentDiff), 100) / 2}%`,
                                marginLeft: `${50 - Math.min(Math.abs(percentDiff), 100) / 2}%`,
                              }}
                            />
                          )}
                          {percentDiff !== null && stat.metric === 'cost' && percentDiff > 0 && (
                            <div
                              className="h-full bg-red-500 transition-all duration-500 z-0 rounded-r-full"
                              style={{
                                width: `${Math.min(percentDiff, 100) / 2}%`,
                                marginLeft: '50%',
                              }}
                            />
                          )}
                          {/* Default diverging fill for other metrics */}
                          {percentDiff !== null && stat.metric !== 'cost' && percentDiff < 0 && (
                            <div
                              className="h-full bg-red-500 transition-all duration-500 z-0 rounded-l-full"
                              style={{
                                width: `${Math.min(Math.abs(percentDiff), 100) / 2}%`,
                                marginLeft: `${50 - Math.min(Math.abs(percentDiff), 100) / 2}%`,
                              }}
                            />
                          )}
                          {percentDiff !== null && stat.metric !== 'cost' && percentDiff > 0 && (
                            <div
                              className="h-full bg-green-500 transition-all duration-500 z-0 rounded-r-full"
                              style={{
                                width: `${Math.min(percentDiff, 100) / 2}%`,
                                marginLeft: '50%',
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 