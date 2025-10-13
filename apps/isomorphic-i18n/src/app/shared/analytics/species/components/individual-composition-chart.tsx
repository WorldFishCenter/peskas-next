import React, { useMemo } from "react";
import WidgetCard from "@components/cards/widget-card";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useAtom } from "jotai";
import { selectedTimeRangeAtom } from "@/app/components/filter-selector";
import { useTranslation } from "@/app/i18n/client";
import { getTimeRangeStartDate } from "../../core/utils/time-range-filter";
import { getFishCategories } from "./composition-chart";
import FishCategorySelector from "../../charts/domain/fish-category-selector";
import { useUserPermissions } from "../../core/hooks/use-user-permissions";

const FISH_GROUPS = [
  "Octopus", "Parrotfish", "Rabbitfish", "Pelagics", "Scavengers", "Goatfish", "Lobster", "Ray", "Rest Of Catch", "Shark"
];

export default function IndividualFishCompositionChart({
  allData, // all individual_fish_distribution records for the BMU
  userFisherId,
  selectedCategory,
  setSelectedCategory,
  title,
  description,
  bmuName = ""
}: {
  allData: any[];
  userFisherId: string;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  title?: string;
  description?: string;
  bmuName?: string;
}) {
  const { t } = useTranslation("common");
  const [selectedTimeRange] = useAtom(selectedTimeRangeAtom);
  const { canCompareWithOthers } = useUserPermissions();

  // Get translated fish categories
  const translatedFishCategories = useMemo(() => getFishCategories(t), [t]);

  // 1. Get time range
  const endDate = new Date();
  let startDate = getTimeRangeStartDate(selectedTimeRange, endDate);
  if (!startDate) startDate = new Date(0);

  // 2. Filter data by category only (time range is already handled by backend)
  const filtered = useMemo(() => {
    return allData.filter(item => item.fish_category === selectedCategory);
  }, [allData, selectedCategory]);

  // 3. Group by month and aggregate for 'you' and optionally mean of 'others'
  const chartData = useMemo(() => {
    if (!filtered.length) return [];
    const grouped: Record<string, { you: number; others: number; fullDate: string } > = {};
    const othersCount: Record<string, Set<string>> = {};
    const othersSum: Record<string, number> = {};
    filtered.forEach(item => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) grouped[monthKey] = { you: 0, others: 0, fullDate: date.toISOString() };
      
      if (item.fisher_id === userFisherId) {
        grouped[monthKey].you += item.mean_catch_kg || 0;
      } else if (canCompareWithOthers) {
        // Only process others data if user can compare with others
        if (!othersCount[monthKey]) othersCount[monthKey] = new Set();
        if (!othersSum[monthKey]) othersSum[monthKey] = 0;
        othersSum[monthKey] += item.mean_catch_kg || 0;
        othersCount[monthKey].add(item.fisher_id);
      }
    });
    // Calculate mean for others only if user can compare
    if (canCompareWithOthers) {
      Object.keys(grouped).forEach(monthKey => {
        const count = othersCount[monthKey]?.size || 0;
        grouped[monthKey].others = count > 0 ? othersSum[monthKey] / count : 0;
      });
    }
    // Convert to array for chart
    return Object.entries(grouped).map(([monthKey, vals]) => {
      const [year, month] = monthKey.split('-');
      const displayMonth = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
      return {
        displayMonth,
        ...vals,
      };
    }).sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  }, [filtered, userFisherId, selectedTimeRange, canCompareWithOthers]);

  // Find selected category option for dropdown
  const selectedCategoryOption = translatedFishCategories.find(c => c.value === selectedCategory);

  // Tooltip styled like individual-fisher-trends
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-600 mb-2">{data.displayMonth}</p>
          <div className="space-y-1.5">
            {/* Your Performance */}
            {data.you !== undefined && data.you !== null && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F79F79' }} />
                <p className="text-sm font-medium">
                  You <span className="font-semibold">{data.you.toFixed(2)} kg</span> <span className="text-xs text-gray-500">(avg. per month)</span>
                </p>
              </div>
            )}
            {/* Others Mean - only show if user can compare */}
            {canCompareWithOthers && data.others !== undefined && data.others !== null && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8693AB' }} />
                <p className="text-sm font-medium">
                  {`Other ${bmuName ? bmuName + ' ' : ''}fishers (mean)`} <span className="font-semibold">{data.others.toFixed(2)} kg</span> <span className="text-xs text-gray-500">(avg. per month)</span>
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const colorYou = "#6366f1";
  const colorOthers = "#f59e42";

  return (
    <WidgetCard title={title} description={description} headerClassName="pb-2">
      {/* Fish group selector dropdown */}
      <div className="mb-4">
        <FishCategorySelector
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          selectedCategoryOption={selectedCategoryOption}
          fishCategories={translatedFishCategories}
        />
      </div>
      {/* Chart */}
      <div className="h-96 w-full pt-9">
        <ResponsiveContainer width="100%" height="100%" minHeight={384}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 50, left: 30, bottom: 0 }}
            barGap={0}
            barCategoryGap={0}
          >
            <XAxis
              dataKey="displayMonth"
              tick={{ fontSize: 12 }}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis
              axisLine={false}
              tick={{ fontSize: 12 }}
              width={50}
              label={{
                value: t('text-unit-kg-fisher-day'),
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: 12, fill: '#666' }
              }}
            />
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="you"
              fill="#F79F79"
              name="You"
              radius={[4, 4, 0, 0]}
              barSize={18}
            />
            {/* Only show others bar if user can compare */}
            {canCompareWithOthers && (
              <Bar
                dataKey="others"
                fill="#8693AB"
                name={`Other ${bmuName ? bmuName + ' ' : ''}fishers (mean)`}
                radius={[4, 4, 0, 0]}
                barSize={18}
              />
            )}
            {/* Only show legend if there are multiple bars */}
            {canCompareWithOthers && (
              <Legend verticalAlign="bottom" height={36} iconType="rect" wrapperStyle={{ paddingTop: '10px' }} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  );
} 