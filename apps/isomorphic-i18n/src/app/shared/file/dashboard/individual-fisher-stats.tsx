"use client";

import { Text, Title } from "rizzui";
import { useTranslation } from "@/app/i18n/client";
import { useIndividualData } from "./hooks/useIndividualData";
import { useUserPermissions } from "./hooks/useUserPermissions";
import WidgetCard from "@components/cards/widget-card";
import MetricCard from "@components/cards/metric-card";
import cn from "@utils/class-names";
import { PiTrendUp, PiTrendDown, PiEquals } from "react-icons/pi";

export default function IndividualFisherStats({ lang }: { lang?: string }) {
  const { t } = useTranslation("common");
  const { userFisherId, isIiaUser } = useUserPermissions();
  const { fisherPerformanceSummary, isLoadingFisherSummary } = useIndividualData();

  // Only render for IIA users
  if (!isIiaUser || !userFisherId) {
    return null;
  }

  if (isLoadingFisherSummary) {
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

  const stats = [
    {
      title: t('dashboard.cpue'),
      value: summary.avg_cpue || 0,
      format: (val: number) => `${val.toFixed(2)} kg/trip`,
      trend: summary.avg_cpue > 10 ? 'up' : summary.avg_cpue < 5 ? 'down' : 'neutral',
      color: 'blue' as const,
    },
    {
      title: t('dashboard.rpue'),
      value: summary.avg_rpue || 0,
      format: (val: number) => `$${val.toFixed(2)}`,
      trend: summary.avg_rpue > 5000 ? 'up' : summary.avg_rpue < 2000 ? 'down' : 'neutral',
      color: 'green' as const,
    },
    {
      title: t('dashboard.cost'),
      value: summary.avg_cost || 0,
      format: (val: number) => `$${val.toFixed(2)}`,
      trend: summary.avg_cost < 1500 ? 'up' : summary.avg_cost > 2000 ? 'down' : 'neutral',
      color: 'purple' as const,
    },
    {
      title: t('dashboard.netProfit'),
      value: summary.net_profit || 0,
      format: (val: number) => `$${val.toFixed(2)}`,
      trend: summary.net_profit > 0 ? 'up' : summary.net_profit < 0 ? 'down' : 'neutral',
      color: 'orange' as const,
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
      <WidgetCard
        title={t('dashboard.yourPerformance')}
        description={t('dashboard.performanceDescription')}
        headerClassName="pb-3"
        className="border-0"
      >
        <div className="flex items-center justify-between">
          <Text className="text-sm text-gray-500">
            Fisher ID: {userFisherId}
          </Text>
          <Text className="text-sm text-gray-500">
            Total trips: {summary.total_trips || 0}
          </Text>
        </div>
      </WidgetCard>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <MetricCard
            key={index}
            title={stat.title}
            metric={stat.format(stat.value)}
            icon={getTrendIcon(stat.trend)}
            iconClassName="h-10 w-10"
            className={cn(
              "border-2",
              getCardColors(stat.color)
            )}
          />
        ))}
      </div>
    </div>
  );
} 