import React, { useState, useMemo } from "react";
import WidgetCard from "@components/cards/widget-card";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { FISH_CATEGORIES } from "./composition-chart";
import SimpleBar from "@ui/simplebar";
import { generateFishCategoryColor } from "../../charts/utils/chart-utils";
import { useAtom } from "jotai";
import { selectedTimeRangeAtom } from "@/app/components/filter-selector";
import { useUserPermissions } from "../../core/hooks/use-user-permissions";

export default function IndividualFishCompositionComparison({
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
  const [visibilityState, setVisibilityState] = useState<Record<string, { opacity: number }>>({});
  const { canCompareWithOthers } = useUserPermissions();
  const endDate = new Date();
  let startDate = new Date(0); // No longer needed, filtering is done in component

  // Use allData as-is (already filtered by backend)
  const filteredData = allData;

  // Find the latest month in the filtered data
  const latestMonth = useMemo(() => {
    if (!Array.isArray(filteredData) || filteredData.length === 0) return null;
    const months = filteredData.map(item => {
      const date = new Date(item.date);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });
    return months.sort().reverse()[0];
  }, [filteredData]);

  // Clean aggregation logic, no debug logs
  const chartData = useMemo(() => {
    if (!filteredData.length) return [];
    const normalize = (str: string) => str.trim().toLowerCase();
    const youTotals: Record<string, number> = {};
    let youSum = 0;
    const othersTotals: Record<string, number> = {};
    let othersSum = 0;
    filteredData.forEach(item => {
      const key = normalize(item.fish_category);
      if (item.fisher_id === userFisherId) {
        youTotals[key] = (youTotals[key] || 0) + (item.mean_catch_kg || 0);
        youSum += item.mean_catch_kg || 0;
      } else if (canCompareWithOthers) {
        // Only process others data if user can compare with others
        othersTotals[key] = (othersTotals[key] || 0) + (item.mean_catch_kg || 0);
        othersSum += item.mean_catch_kg || 0;
      }
    });
    const youRow: Record<string, any> = { label: "You" };
    const othersRow: Record<string, any> = { label: "Other BMU fishers" };
    let youTotalPct = 0;
    let othersTotalPct = 0;
    FISH_CATEGORIES.forEach(cat => {
      const key = normalize(cat.value);
      const youPct = youSum > 0 ? ((youTotals[key] || 0) / youSum * 100) : 0;
      youRow[cat.value] = +youPct.toFixed(2);
      youTotalPct += youPct;
      
      // Only process others percentages if user can compare
      if (canCompareWithOthers) {
        const othersPct = othersSum > 0 ? ((othersTotals[key] || 0) / othersSum * 100) : 0;
        othersRow[cat.value] = +othersPct.toFixed(2);
        othersTotalPct += othersPct;
      }
    });
    if (youTotalPct !== 100) {
      const maxKey = FISH_CATEGORIES.reduce((max, cat) => youRow[cat.value] > youRow[max] ? cat.value : max, FISH_CATEGORIES[0].value);
      youRow[maxKey] += +(100 - youTotalPct).toFixed(2);
    }
    if (canCompareWithOthers && othersTotalPct !== 100) {
      const maxKey = FISH_CATEGORIES.reduce((max, cat) => othersRow[cat.value] > othersRow[max] ? cat.value : max, FISH_CATEGORIES[0].value);
      othersRow[maxKey] += +(100 - othersTotalPct).toFixed(2);
    }
    // Return only user's row if they can't compare, otherwise return both
    return canCompareWithOthers ? [youRow, othersRow] : [youRow];
  }, [filteredData, userFisherId, canCompareWithOthers]);

  // Legend and color mapping
  const categoryDisplays = FISH_CATEGORIES.map(cat => ({
    id: cat.value,
    name: cat.label,
    color: generateFishCategoryColor(cat.label),
  }));
  // Row labels for the chart
  const rowLabels = canCompareWithOthers ? [
    { label: "You" },
    { label: `Other ${bmuName ? bmuName + ' ' : ''}fishers (mean, avg. per month)` }
  ] : [
    { label: "You" }
  ];

  // Interactive legend logic
  React.useEffect(() => {
    // Reset legend visibility when categories change
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
  // Group entries by 'You' and 'Other BMU fishers', only show non-zero values
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      // Group by label ("You" or full others label)
      const othersLabel = `Other ${bmuName ? bmuName + ' ' : ''}fishers (mean, avg. per month)`;
      const youEntries = payload.filter((entry: any) => entry.payload.label === "You" && entry.value > 0);
      const othersEntries = payload.filter((entry: any) => entry.payload.label === othersLabel && entry.value > 0);
      if (youEntries.length === 0 && othersEntries.length === 0) return null;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-md shadow-md">
          <div className="space-y-2">
            {youEntries.length > 0 && (
              <div>
                <div className="font-semibold text-gray-900 mb-1">You</div>
                {youEntries.map((entry: any, idx: number) => (
                  <div key={`tooltip-you-${idx}`} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-gray-700">{entry.name}: {entry.value.toFixed(2)}% <span className="text-xs text-gray-500">(avg. catch per month)</span></span>
                  </div>
                ))}
              </div>
            )}
            {othersEntries.length > 0 && (
              <div>
                <div className="font-semibold text-gray-900 mb-1 mt-2">{othersLabel}</div>
                {othersEntries.map((entry: any, idx: number) => (
                  <div key={`tooltip-others-${idx}`} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-gray-700">{entry.name}: {entry.value.toFixed(2)}% <span className="text-xs text-gray-500">(avg. catch per month)</span></span>
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

  // Interactive Legend
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

  if (!latestMonth) {
    return <WidgetCard title={title || "Fish Composition Comparison"}><div className="h-64 flex items-center justify-center text-gray-400">No data</div></WidgetCard>;
  }

  return (
    <WidgetCard title={title} description={description} headerClassName="pb-2">
      <SimpleBar className="h-full">
        <div className="p-4 md:p-6 h-full">
          <div className="w-full" style={{ height: "220px" }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={384}>
              <BarChart
                data={chartData.map((row, i) => ({ ...row, label: rowLabels[i]?.label || row.label }))}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
                barCategoryGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" 
                 label={{
                   value: 'Avg. catch composition (% per month)',
                   position: 'insideBottom',
                   offset: -10,
                   style: { textAnchor: 'middle', fontSize: 12, fill: '#666' }
                 }}
                />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12 }} width={180} />
                <Tooltip content={<CustomTooltip />} />
                {categoryDisplays.map(category => (
                  <Bar
                    key={category.id}
                    dataKey={category.id}
                    name={category.name}
                    stackId="a"
                    fill={category.color}
                    isAnimationActive={false}
                    fillOpacity={visibilityState[category.id]?.opacity ?? 1}
                    hide={visibilityState[category.id]?.opacity === 0.2}
                  />
                ))}
                <Legend verticalAlign="bottom" height={36} iconType="rect" wrapperStyle={{ paddingTop: '10px' }} content={<CustomLegend />} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SimpleBar>
    </WidgetCard>
  );
} 