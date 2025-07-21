import React, { useMemo } from "react";
import WidgetCard from "@components/cards/widget-card";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useAtom } from "jotai";
import { selectedTimeRangeAtom } from "@/app/components/filter-selector";
import { getTimeRangeStartDate } from "./utils/timeRangeFilter";
import { FISH_CATEGORIES } from "./fish-composition-chart";
import FishCategorySelector from "./charts/FishCategorySelector";

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
  const [selectedTimeRange] = useAtom(selectedTimeRangeAtom);
  // 1. Get time range
  const endDate = new Date();
  let startDate = getTimeRangeStartDate(selectedTimeRange, endDate);
  if (!startDate) startDate = new Date(0);

  // 2. Filter data by category only (time range is already handled by backend)
  const filtered = useMemo(() => {
    return allData.filter(item => item.fish_category === selectedCategory);
  }, [allData, selectedCategory]);

  // 3. Group by month and aggregate for 'you' and mean of 'others'
  const chartData = useMemo(() => {
    if (!filtered.length) return [];
    const grouped: Record<string, { you: number; others: number; fullDate: string } > = {};
    const othersCount: Record<string, Set<string>> = {};
    const othersSum: Record<string, number> = {};
    filtered.forEach(item => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) grouped[monthKey] = { you: 0, others: 0, fullDate: date.toISOString() };
      if (!othersCount[monthKey]) othersCount[monthKey] = new Set();
      if (!othersSum[monthKey]) othersSum[monthKey] = 0;
      if (item.fisher_id === userFisherId) {
        grouped[monthKey].you += item.total_catch_kg || 0;
      } else {
        othersSum[monthKey] += item.total_catch_kg || 0;
        othersCount[monthKey].add(item.fisher_id);
      }
    });
    // Calculate mean for others
    Object.keys(grouped).forEach(monthKey => {
      const count = othersCount[monthKey]?.size || 0;
      grouped[monthKey].others = count > 0 ? othersSum[monthKey] / count : 0;
    });
    // Convert to array for chart
    return Object.entries(grouped).map(([monthKey, vals]) => {
      const [year, month] = monthKey.split('-');
      const displayMonth = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
      return {
        displayMonth,
        ...vals,
      };
    }).sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  }, [filtered, userFisherId, selectedTimeRange]);

  // Find selected category option for dropdown
  const selectedCategoryOption = FISH_CATEGORIES.find(c => c.value === selectedCategory);

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
                  You <span className="font-semibold">{data.you.toFixed(2)} kg</span>
                </p>
              </div>
            )}
            {/* Others Mean */}
            {data.others !== undefined && data.others !== null && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8693AB' }} />
                <p className="text-sm font-medium">
                  {`Other ${bmuName ? bmuName + ' ' : ''}fishers (mean)`} <span className="font-semibold">{data.others.toFixed(2)} kg</span>
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
          fishCategories={FISH_CATEGORIES}
        />
      </div>
      {/* Chart */}
      <div className="h-96 w-full pt-9">
        <ResponsiveContainer width="100%" height="100%">
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
            <Bar
              dataKey="others"
              fill="#8693AB"
              name={`Other ${bmuName ? bmuName + ' ' : ''}fishers (mean)`}
              radius={[4, 4, 0, 0]}
              barSize={18}
            />
            <Legend verticalAlign="bottom" height={36} iconType="rect" wrapperStyle={{ paddingTop: '10px' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  );
} 