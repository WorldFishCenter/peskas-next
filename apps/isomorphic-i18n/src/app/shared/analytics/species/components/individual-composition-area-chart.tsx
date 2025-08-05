import React, { useMemo, useState } from "react";
import WidgetCard from "@components/cards/widget-card";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useAtom } from "jotai";
import { selectedTimeRangeAtom } from "@/app/components/filter-selector";
import { FISH_CATEGORIES } from "./composition-chart";
import { generateFishCategoryColor } from "../../charts/utils/chart-utils";
import cn from "@utils/class-names";
import { useTranslation } from "@/app/i18n/client";

export default function IndividualFishCompositionAreaChart({
  allData,
  userFisherId,
  title,
  description,
  bmuName = ""
}: {
  allData: any[];
  userFisherId: string;
  title?: string;
  description?: string;
  bmuName?: string;
}) {
  const [selectedTimeRange] = useAtom(selectedTimeRangeAtom);
  const [chartMode, setChartMode] = useState<'absolute' | 'percent'>('absolute');
  const [visibilityState, setVisibilityState] = useState<Record<string, { opacity: number }>>({});
  const { t } = useTranslation("common");

  // Group data by month and aggregate for 'You' and 'Others'
  const chartData = useMemo(() => {
    if (!allData.length) return [];
    const normalize = (str: string) => str.trim().toLowerCase();
    // Group by month
    const grouped: Record<string, { youTotals: Record<string, number>; othersTotals: Record<string, number>; youSum: number; othersSum: number } > = {};
    allData.forEach(item => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) grouped[monthKey] = { youTotals: {}, othersTotals: {}, youSum: 0, othersSum: 0 };
      const key = normalize(item.fish_category);
      if (item.fisher_id === userFisherId) {
        grouped[monthKey].youTotals[key] = (grouped[monthKey].youTotals[key] || 0) + (item.mean_catch_kg || 0);
        grouped[monthKey].youSum += item.mean_catch_kg || 0;
      } else {
        grouped[monthKey].othersTotals[key] = (grouped[monthKey].othersTotals[key] || 0) + (item.mean_catch_kg || 0);
        grouped[monthKey].othersSum += item.mean_catch_kg || 0;
      }
    });
    // Build chart data: for each month, two rows (You, Others)
    return Object.entries(grouped).map(([monthKey, vals]) => {
      const displayMonth = new Date(monthKey + '-01').toLocaleString('default', { month: 'short', year: 'numeric' });
      const row: Record<string, any> = { month: displayMonth };
      FISH_CATEGORIES.forEach(cat => {
        const key = normalize(cat.value);
        row[`you_${cat.value}`] = vals.youTotals[key] || 0;
        row[`others_${cat.value}`] = vals.othersTotals[key] || 0;
      });
      row.youSum = vals.youSum;
      row.othersSum = vals.othersSum;
      return row;
    }).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [allData, userFisherId]);

  // Legend and color mapping
  const categoryDisplays = FISH_CATEGORIES.map(cat => ({
    id: cat.value,
    name: cat.label,
    color: generateFishCategoryColor(cat.label),
  }));

  // Interactive legend logic
  React.useEffect(() => {
    const initialVisibility: Record<string, { opacity: number }> = {};
    categoryDisplays.forEach(category => {
      initialVisibility[category.id] = { opacity: 1 };
    });
    setVisibilityState(initialVisibility);
  }, [categoryDisplays.length]);

  const handleLegendClick = (categoryId: string) => {
    setVisibilityState(prev => {
      const newState = { ...prev };
      newState[categoryId] = {
        opacity: prev[categoryId]?.opacity === 1 ? 0.2 : 1
      };
      return newState;
    });
  };

  // Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Group entries by 'You' and 'Other BMU fishers', only show non-zero values
      const youEntries = payload.filter((entry: any) => entry.name.startsWith('You:') && entry.value > 0);
      const othersEntries = payload.filter((entry: any) => entry.name.startsWith(`Other ${bmuName ? bmuName + ' ' : ''}fishers`) && entry.value > 0);
      if (youEntries.length === 0 && othersEntries.length === 0) return null;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-md shadow-md">
          <p className="font-medium text-gray-900">{label}</p>
          <div className="space-y-2 mt-2">
            {youEntries.length > 0 && (
              <div>
                <div className="font-semibold text-gray-900 mb-1">You</div>
                {youEntries.map((entry: any, idx: number) => (
                  <div key={`tooltip-you-${idx}`} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-gray-700">{entry.name.replace('You: ', '')}: {entry.value.toFixed(2)}{chartMode === 'absolute' ? ' kg (avg. per month)' : '%'}</span>
                  </div>
                ))}
              </div>
            )}
            {othersEntries.length > 0 && (
              <div>
                <div className="font-semibold text-gray-900 mb-1 mt-2">{`Other ${bmuName ? bmuName + ' ' : ''}fishers`}</div>
                {othersEntries.map((entry: any, idx: number) => (
                  <div key={`tooltip-others-${idx}`} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-gray-700">{entry.name.replace(`Other ${bmuName ? bmuName + ' ' : ''}fishers: `, '')}: {entry.value.toFixed(2)}{chartMode === 'absolute' ? ' kg (avg. per month)' : '%'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const CustomLegend = () => (
    <div className="flex justify-center mt-6">
      <div className="inline-flex flex-wrap justify-center gap-4">
        {categoryDisplays.map(category => (
          <div
            key={category.id}
            className="flex items-center gap-2 px-2 py-1 cursor-pointer transition-opacity duration-200 rounded hover:bg-gray-100"
            onClick={() => handleLegendClick(category.id)}
            style={{ opacity: visibilityState[category.id]?.opacity ?? 1 }}
          >
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
            <span className="text-sm text-gray-700 whitespace-nowrap">{category.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // Prepare area chart data for absolute/percent mode
  const areaChartData = useMemo(() => {
    if (chartMode === 'absolute') return chartData;
    // For percent mode, convert each value to percent of sum for each group
    return chartData.map(row => {
      const newRow: Record<string, any> = { ...row };
      const youSum = row.youSum || 0;
      const othersSum = row.othersSum || 0;
      FISH_CATEGORIES.forEach(cat => {
        newRow[`you_${cat.value}`] = youSum > 0 ? +(row[`you_${cat.value}`] / youSum * 100).toFixed(2) : 0;
        newRow[`others_${cat.value}`] = othersSum > 0 ? +(row[`others_${cat.value}`] / othersSum * 100).toFixed(2) : 0;
      });
      return newRow;
    });
  }, [chartData, chartMode]);

  return (
    <WidgetCard title={title} description={description} headerClassName="pb-2">
      <div className="flex gap-2 mb-4">
        <button
          className={cn(
            "px-4 py-2 text-sm rounded-md transition duration-200 w-full sm:w-auto",
            chartMode === 'absolute' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
          onClick={() => setChartMode('absolute')}
        >
                                  {t('text-average-values')}
        </button>
        <button
          className={cn(
            "px-4 py-2 text-sm rounded-md transition duration-200 w-full sm:w-auto",
            chartMode === 'percent' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
          onClick={() => setChartMode('percent')}
        >
          {t('text-percent-values')}
        </button>
      </div>
      <div className="w-full h-[400px]">
                      <ResponsiveContainer width="100%" height="100%" minHeight={384}>
          <AreaChart
            data={areaChartData}
            margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis 
              tick={{ fontSize: 12 }} 
              unit={chartMode === 'percent' ? '%' : ' kg'}
              domain={chartMode === 'percent' ? [0, 100] : ['auto', 'auto']}
              label={chartMode === 'absolute' ? {
                value: 'Avg. catch (kg/fisher/month)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: 12, fill: '#666' }
              } : undefined}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* You areas */}
            {categoryDisplays.map(category => (
              <Area
                key={`you_${category.id}`}
                type="monotone"
                dataKey={`you_${category.id}`}
                name={`You: ${category.name}`}
                stackId="you"
                stroke={category.color}
                fill={category.color}
                fillOpacity={visibilityState[category.id]?.opacity ?? 1}
                hide={visibilityState[category.id]?.opacity === 0.2}
                isAnimationActive={false}
              />
            ))}
            {/* Others areas */}
            {categoryDisplays.map(category => (
              <Area
                key={`others_${category.id}`}
                type="monotone"
                dataKey={`others_${category.id}`}
                name={`Other ${bmuName ? bmuName + ' ' : ''}fishers: ${category.name}`}
                stackId="others"
                stroke={category.color}
                fill={category.color}
                fillOpacity={(visibilityState[category.id]?.opacity ?? 1) * 0.5}
                hide={visibilityState[category.id]?.opacity === 0.2}
                isAnimationActive={false}
                strokeDasharray="3 3"
              />
            ))}
            <Legend verticalAlign="bottom" height={36} iconType="rect" wrapperStyle={{ paddingTop: '10px' }} content={<CustomLegend />} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  );
} 