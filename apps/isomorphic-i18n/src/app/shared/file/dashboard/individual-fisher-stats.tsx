"use client";

import { Text, Title } from "rizzui";
import { useTranslation } from "@/app/i18n/client";
import { useIndividualData } from "./hooks/useIndividualData";
import { useUserPermissions } from "./hooks/useUserPermissions";
import WidgetCard from "@components/cards/widget-card";
import MetricCard from "@components/cards/metric-card";
import cn from "@utils/class-names";
import { PiTrendUp, PiTrendDown, PiEquals } from "react-icons/pi";
import { api } from "@/trpc/react";
import { useMemo, useEffect, useState } from "react";
import { getClientLanguage } from "@/app/i18n/language-link";

export default function IndividualFisherStats({ lang }: { lang?: string }) {
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
  const { fisherPerformanceSummary, isLoadingFisherSummary, fisherData } = useIndividualData();

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

    const cpueValues = otherFishersData.filter(d => d.fisher_cpue != null).map(d => d.fisher_cpue);
    const rpueValues = otherFishersData.filter(d => d.fisher_rpue != null).map(d => d.fisher_rpue);
    const costValues = otherFishersData.filter(d => d.fisher_cost != null).map(d => d.fisher_cost);

    return {
      avgCpue: cpueValues.length > 0 ? cpueValues.reduce((a, b) => a + b, 0) / cpueValues.length : 0,
      avgRpue: rpueValues.length > 0 ? rpueValues.reduce((a, b) => a + b, 0) / rpueValues.length : 0,
      avgCost: costValues.length > 0 ? costValues.reduce((a, b) => a + b, 0) / costValues.length : 0,
    };
  }, [bmuData, userFisherId]);

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

  const summary = fisherPerformanceSummary?.[0] || {};

  const getPerformanceStatus = (fisherValue: number, bmuAvg: number, metric: string) => {
    if (!bmuAvg) return 'neutral';
    const percentDiff = ((fisherValue - bmuAvg) / bmuAvg) * 100;
    
    // For cost, lower is better
    if (metric === 'cost') {
      if (percentDiff < -10) return 'up';
      if (percentDiff > 10) return 'down';
      return 'neutral';
    }
    
    // For other metrics, higher is better
    if (percentDiff > 10) return 'up';
    if (percentDiff < -10) return 'down';
    return 'neutral';
  };

  const stats = [
    {
      title: t('text-cpue'),
      value: summary.avg_cpue || 0,
      bmuAvg: bmuAverages?.avgCpue || 0,
      format: (val: number) => `${val.toFixed(2)} kg/trip`,
      trend: getPerformanceStatus(summary.avg_cpue || 0, bmuAverages?.avgCpue || 0, 'cpue'),
      color: 'blue' as const,
      metric: 'cpue',
    },
    {
      title: t('text-rpue'),
      value: summary.avg_rpue || 0,
      bmuAvg: bmuAverages?.avgRpue || 0,
      format: (val: number) => `$${val.toFixed(2)}`,
      trend: getPerformanceStatus(summary.avg_rpue || 0, bmuAverages?.avgRpue || 0, 'rpue'),
      color: 'green' as const,
      metric: 'rpue',
    },
    {
      title: t('text-cost'),
      value: summary.avg_cost || 0,
      bmuAvg: bmuAverages?.avgCost || 0,
      format: (val: number) => `$${val.toFixed(2)}`,
      trend: getPerformanceStatus(summary.avg_cost || 0, bmuAverages?.avgCost || 0, 'cost'),
      color: 'purple' as const,
      metric: 'cost',
    },
    {
      title: t('text-net-profit'),
      value: summary.net_profit || 0,
      bmuAvg: null, // We don't have BMU average for net profit
      format: (val: number) => `$${val.toFixed(2)}`,
      trend: summary.net_profit > 0 ? 'up' : summary.net_profit < 0 ? 'down' : 'neutral',
      color: 'orange' as const,
      metric: 'profit',
    },
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <PiTrendUp className="h-5 w-5 text-green-500" />;
      case 'down':
        return <PiTrendDown className="h-5 w-5 text-red-500" />;
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

  return (
    <div className="space-y-5">
      {/* User info header */}
      {/* <WidgetCard
        title={t('text-your-performance')}
        description={t('text-performance-description')}
        headerClassName="pb-3"
        className="border-0"
      >
        <div className="flex items-center justify-between">
                      <Text className="text-sm text-gray-500">
              {t('text-fisher-id')}: {userFisherId}
            </Text>
            <Text className="text-sm text-gray-500">
              {t('text-total-trips')}: {summary.total_trips || 0}
            </Text>
        </div>
      </WidgetCard> */}

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const percentDiff = stat.bmuAvg && stat.bmuAvg > 0
            ? ((stat.value - stat.bmuAvg) / stat.bmuAvg * 100)
            : null;
          
          return (
            <div
              key={index}
              className={cn(
                "rounded-lg border-2 p-6 relative overflow-hidden",
                getCardColors(stat.color)
              )}
            >
              {/* Performance indicator */}
              {stat.trend !== 'neutral' && (
                <div className="absolute top-3 right-3">
                  {getTrendIcon(stat.trend)}
                </div>
              )}
              
              {/* Title */}
              <Text className="text-sm font-medium text-gray-600 mb-2">
                {stat.title}
              </Text>
              
              {/* Fisher's value */}
              <div className="mb-3">
                <Text className="text-2xl font-bold text-gray-900">
                  {stat.format(stat.value)}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">
                  {t('text-your-average')}
                </Text>
              </div>
              
              {/* BMU comparison */}
              {stat.bmuAvg !== null && bmuAverages && (
                <div className="border-t pt-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <Text className="text-xs text-gray-500">
                      {fisherBMU} {t('text-average')}:
                    </Text>
                    <Text className="text-xs font-medium text-gray-700">
                      {stat.format(stat.bmuAvg)}
                    </Text>
                  </div>
                  
                  {percentDiff !== null && (
                    <div className="flex items-center justify-between">
                      <Text className="text-xs text-gray-500">
                        {t('text-difference')}:
                      </Text>
                      <Text className={cn(
                        "text-xs font-medium",
                        stat.metric === 'cost' 
                          ? percentDiff < 0 ? "text-green-600" : percentDiff > 0 ? "text-red-600" : "text-gray-600"
                          : percentDiff > 0 ? "text-green-600" : percentDiff < 0 ? "text-red-600" : "text-gray-600"
                      )}>
                        {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
                      </Text>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 