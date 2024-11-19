"use client";

import { useTranslation } from '@/app/i18n/client';
import WidgetCard from '@components/cards/widget-card';
import { useEffect, useState } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import cn from '@utils/class-names';
import { api } from "@/trpc/react";

type MetricKey = "mean_trip_catch" | "mean_effort" | "mean_cpue" | "mean_cpua";

interface RadarData {
  month: string;
  value: number;
}

interface MetricInfo {
  label: string;
  unit: string;
}

interface CatchRadarChartProps {
  className?: string;
  lang?: string;
  selectedMetric: MetricKey;
}

const METRIC_INFO: Record<MetricKey, MetricInfo> = {
  mean_trip_catch: { label: 'Mean Catch per Trip', unit: 'kg' },
  mean_effort: { label: 'Mean Effort', unit: 'hours' },
  mean_cpue: { label: 'Mean CPUE', unit: 'kg/hour' },
  mean_cpua: { label: 'Mean CPUA', unit: 'kg/area' }
};

const CustomTooltip = ({ active, payload, metric }: any) => {
  if (active && payload && payload.length) {
    const metricInfo = METRIC_INFO[metric as MetricKey];
    return (
      <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
        <p className="text-sm font-medium text-gray-600 mb-1">
          {payload[0].payload.month}
        </p>
        <p className="text-sm">
          <span className="font-medium">{metricInfo.label}:</span>{' '}
          {payload[0].value.toFixed(1)} {metricInfo.unit}
        </p>
      </div>
    );
  }
  return null;
};

export default function CatchRadarChart({
  className,
  lang,
  selectedMetric
}: CatchRadarChartProps) {
  const [data, setData] = useState<RadarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation(lang!);

  const { data: meanCatch } = api.aggregatedCatch.meanCatchRadar.useQuery({
    metric: selectedMetric
  });

  useEffect(() => {
    if (!meanCatch) return;

    try {
      setLoading(true);
      if (!meanCatch || !Array.isArray(meanCatch) || meanCatch.length === 0) {
        setError('No data available');
        return;
      }

      setData(meanCatch);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Error fetching data');
    } finally {
      setLoading(false);
    }
  }, [meanCatch, selectedMetric]);

  if (loading) return <div>Loading chart...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data || data.length === 0) return <div>No data available for Bureni</div>;

  return (
    <WidgetCard
      title={METRIC_INFO[selectedMetric].label}
      className={cn('@container', className)}
    >
      <div className="mt-5 h-96 w-full pb-2 @sm:h-96 @xl:pb-0 @2xl:aspect-[1060/660] @2xl:h-auto lg:mt-7">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <PolarGrid gridType="polygon" />
            <PolarAngleAxis
              dataKey="month"
              tick={{ fill: '#666', fontSize: 14 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 'auto']}
              tick={{ fill: '#666' }}
            />
            <Radar
              name={METRIC_INFO[selectedMetric].label}
              dataKey="value"
              stroke="#0c526e"
              fill="#0c526e"
              fillOpacity={0.25}
            />
            <Tooltip content={(props) => <CustomTooltip {...props} metric={selectedMetric} />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  );
}