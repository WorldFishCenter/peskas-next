"use client";

import { BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";
import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import isEmpty from "lodash/isEmpty";

import { Button, Text } from "rizzui";
import cn from "@utils/class-names";
import { useScrollableSlider } from "@hooks/use-scrollable-slider";
import { PiCaretLeftBold, PiCaretRightBold } from "react-icons/pi";
import MetricCard from "@components/cards/metric-card";
import TrendingUpIcon from "@components/icons/trending-up";
import TrendingDownIcon from "@components/icons/trending-down";
import { useTranslation } from "@/app/i18n/client";
import { api } from "@/trpc/react";
import { bmusAtom } from "@/app/components/filter-selector";

type FileStatsType = {
  className?: string;
  lang?: string;
};

interface StatData {
  id: string;
  title: string;
  metric: string;
  increased: boolean;
  decreased: boolean;
  percentage: string;
  fill: string;
  chart: Array<{
    day: string;
    sale: number;
  }>;
}

interface StatsData {
  current: number;
  percentage: number;
  trend: Array<{ day: string; sale: number }>;
}

interface MonthlyStats {
  submissions: StatsData;
  fishers: StatsData;
  catches: StatsData;
  weight: StatsData;
}

const CustomTooltip = ({ active, payload, onHover }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const month = payload[0].payload.day;

    if (onHover) {
      onHover(month);
    }

    return (
      <div className="bg-white p-2 border border-gray-200 shadow-lg rounded-lg">
        <p className="text-xs font-medium">
          {value.toLocaleString()} ({month})
        </p>
      </div>
    );
  }
  return null;
};

export function FileStatGrid({
  className,
  lang,
}: {
  className?: string;
  lang?: string;
}) {
  const { t } = useTranslation(lang!, "common");
  const [statsData, setStatsData] = useState<StatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [bmus] = useAtom(bmusAtom);
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);
  const { data: monthlyData } = api.monthlyStats.allStats.useQuery({ bmus });

  useEffect(() => {
    if (!monthlyData?.submissions) {
      setLoading(false);
      return;
    }

    try {
      const transformedStats: StatData[] = [
        {
          id: "1",
          title: "Total surveys",
          metric: monthlyData.submissions.current.toString(),
          increased: monthlyData.submissions.percentage > 0,
          decreased: monthlyData.submissions.percentage < 0,
          percentage:
            monthlyData.submissions.percentage > 0
              ? `+${monthlyData.submissions.percentage.toFixed(2)}`
              : monthlyData.submissions.percentage.toFixed(2),
          fill: "#0c526e",
          chart: monthlyData.submissions.trend,
        },
        {
          id: "2",
          title: "Total fishers",
          metric: monthlyData.fishers.current.toString(),
          increased: monthlyData.fishers.percentage > 0,
          decreased: monthlyData.fishers.percentage < 0,
          percentage:
            monthlyData.fishers.percentage > 0
              ? `+${monthlyData.fishers.percentage.toFixed(2)}`
              : monthlyData.fishers.percentage.toFixed(2),
          fill: "#fc3468",
          chart: monthlyData.fishers.trend,
        },
        {
          id: "3",
          title: "Total catches",
          metric: monthlyData.catches.current.toString(),
          increased: monthlyData.catches.percentage > 0,
          decreased: monthlyData.catches.percentage < 0,
          percentage:
            monthlyData.catches.percentage > 0
              ? `+${monthlyData.catches.percentage.toFixed(2)}`
              : monthlyData.catches.percentage.toFixed(2),
          fill: "#f09609",
          chart: monthlyData.catches.trend,
        },
        {
          id: "4",
          title: "Monthly tonnes",
          metric: monthlyData.weight.current.toFixed(1),
          increased: monthlyData.weight.percentage > 0,
          decreased: monthlyData.weight.percentage < 0,
          percentage:
            monthlyData.weight.percentage > 0
              ? `+${monthlyData.weight.percentage.toFixed(2)}`
              : monthlyData.weight.percentage.toFixed(2),
          fill: "#2563eb",
          chart: monthlyData.weight.trend,
        },
      ];

      setStatsData(transformedStats);
    } catch (error) {
      console.error("Error transforming data:", error);
    } finally {
      setLoading(false);
    }
  }, [monthlyData, bmus]);

  if (loading) return <div>Loading stats...</div>;
  if (!statsData.length) return <div>No data available for selected BMUs</div>;

  return (
    <>
      {statsData.map((stat) => {
        // By default, show the latest month as current (last element of the array)
        const currentIdx = hoveredMonth
          ? stat.chart.findIndex(d => d.day === hoveredMonth)
          : stat.chart.length - 1;

        const currentMonth = stat.chart[currentIdx]?.day;
        const currentValue = stat.chart[currentIdx]?.sale || 0;

        // The previous month is the one before currentIdx in the array, since oldest is at index 0 and newest at the end
        const previousMonth = stat.chart[currentIdx - 1]?.day;
        const previousValue = stat.chart[currentIdx - 1]?.sale || 0;

        // Calculate change FROM previous TO current
        const percentChange = previousValue ? ((currentValue - previousValue) / previousValue) * 100 : 0;
        const isIncrease = percentChange > 0;

        return (
          <MetricCard
            key={stat.title + stat.id}
            title={t(stat.title)}
            metric={stat.metric}
            rounded="lg"
            metricClassName="text-2xl mt-1"
            info={
              <Text className="mt-4 flex items-center text-sm">
                <Text
                  as="span"
                  className={cn(
                    "me-2 inline-flex items-center font-medium",
                    isIncrease ? "text-green-500" : "text-red-500"
                  )}
                >
                  {isIncrease ? (
                    <TrendingUpIcon className="me-1 h-4 w-4" />
                  ) : (
                    <TrendingDownIcon className="me-1 h-4 w-4" />
                  )}
                  {isIncrease ? '+' : ''}{Math.abs(percentChange).toFixed(2)}%
                </Text>
                {previousMonth && currentMonth && (
                  <span 
                    className={cn(
                      "text-xs",
                      isIncrease ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {previousMonth} → {currentMonth}
                  </span>
                )}
              </Text>
            }
            chart={
              <div className="h-12 w-20 @[16.25rem]:h-16 @[16.25rem]:w-24 @xs:h-20 @xs:w-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart barSize={6} barGap={5} data={stat.chart}>
                    <Bar
                      dataKey="sale"
                      fill={stat.fill}
                      radius={[2, 2, 0, 0]}
                    />
                    <Tooltip
                      content={(props) => (
                        <CustomTooltip {...props} onHover={setHoveredMonth} />
                      )}
                      cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            }
            chartClassName="flex flex-col w-auto h-auto text-center"
            className={cn(
              "@container @7xl:text-[15px] [&>div]:items-end",
              "w-full max-w-full",
              className
            )}
          />
        );
      })}
    </>
  );
}

export default function FileStats({ className, lang }: FileStatsType) {
  const {
    sliderEl,
    sliderPrevBtn,
    sliderNextBtn,
    scrollToTheRight,
    scrollToTheLeft,
  } = useScrollableSlider();

  return (
    <div
      className={cn(
        "relative flex w-auto items-center overflow-hidden",
        className
      )}
    >
      <Button
        title="Prev"
        variant="text"
        ref={sliderPrevBtn}
        onClick={() => scrollToTheLeft()}
        className="!absolute -left-1 top-0 z-10 !h-full w-20 !justify-start rounded-none bg-gradient-to-r from-gray-0 via-gray-0/70 to-transparent px-0 ps-1 text-gray-500 hover:text-gray-900 3xl:hidden dark:from-gray-50 dark:via-gray-50/70"
      >
        <PiCaretLeftBold className="h-5 w-5" />
      </Button>
      <div className="w-full overflow-hidden">
        <div
          ref={sliderEl}
          className="custom-scrollbar-x grid grid-flow-col gap-5 overflow-x-auto scroll-smooth 2xl:gap-6 3xl:gap-8"
        >
          <FileStatGrid className="min-w-[292px]" lang={lang} />
        </div>
      </div>
      <Button
        title="Next"
        variant="text"
        ref={sliderNextBtn}
        onClick={() => scrollToTheRight()}
        className="!absolute right-0 top-0 z-10 !h-full w-20 !justify-end rounded-none bg-gradient-to-l from-gray-0 via-gray-0/70 to-transparent px-0 text-gray-500 hover:text-gray-900 3xl:hidden dark:from-gray-50 dark:via-gray-50/70"
      >
        <PiCaretRightBold className="h-5 w-5" />
      </Button>
    </div>
  );
}
