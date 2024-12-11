"use client";

import { BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";
import { useState, useEffect } from "react";
import { useAtom } from 'jotai';
import isEmpty from 'lodash/isEmpty';

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

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-200 shadow-lg rounded-lg">
        <p className="text-sm font-medium">
          {payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export function FileStatGrid({ className, lang }: { className?: string; lang?: string; }) {

  const { t } = useTranslation(lang!, "common");
  const [statsData, setStatsData] = useState<StatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [bmus] = useAtom(bmusAtom);
  const { data: monthlyData } = api.monthlyStats.allStats.useQuery({ bmus });

  useEffect(() => {
    if (isEmpty(monthlyData)) {
      setLoading(false)
      return
    }

    const data: MonthlyStats = monthlyData
    const transformedStats: StatData[] = [
      {
        id: "1",
        title: "Total surveys",
        metric: data.submissions.current.toString(),
        increased: data.submissions.percentage > 0,
        decreased: data.submissions.percentage < 0,
        percentage:
          data.submissions.percentage > 0
            ? `+${data.submissions.percentage.toFixed(2)}`
            : data.submissions.percentage.toFixed(2),
        fill: "#015DE1",
        chart: data.submissions.trend,
      },
      {
        id: "2",
        title: "Total fishers",
        metric: data.fishers.current.toString(),
        increased: data.fishers.percentage > 0,
        decreased: data.fishers.percentage < 0,
        percentage:
          data.fishers.percentage > 0
            ? `+${data.fishers.percentage.toFixed(2)}`
            : data.fishers.percentage.toFixed(2),
        fill: "#048848",
        chart: data.fishers.trend,
      },
      {
        id: "3",
        title: "Total catches",
        metric: data.catches.current.toString(),
        increased: data.catches.percentage > 0,
        decreased: data.catches.percentage < 0,
        percentage:
          data.catches.percentage > 0
            ? `+${data.catches.percentage.toFixed(2)}`
            : data.catches.percentage.toFixed(2),
        fill: "#B92E5D",
        chart: data.catches.trend,
      },
      {
        id: "4",
        title: "Monthly tonnes",
        metric: data.weight.current.toFixed(1),
        increased: data.weight.percentage > 0,
        decreased: data.weight.percentage < 0,
        percentage:
          data.weight.percentage > 0
            ? `+${data.weight.percentage.toFixed(2)}`
            : data.weight.percentage.toFixed(2),
        fill: "#8200E9",
        chart: data.weight.trend,       
      },
    ];
    setStatsData(transformedStats);
    setLoading(false);

  }, [ monthlyData ]);

  if (loading) return <div>Loading stats...</div>;
  if (!statsData.length) return <div>No data available</div>;

  return (
    <>
      {statsData.map((stat) => (
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
                  stat.increased ? "text-green-500" : "text-red-500"
                )}
              >
                {stat.increased ? (
                  <TrendingUpIcon className="me-1 h-4 w-4" />
                ) : (
                  <TrendingDownIcon className="me-1 h-4 w-4" />
                )}
                {stat.percentage}%
              </Text>
              {t("text-last-month")}
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
                    content={<CustomTooltip />}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
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
      ))}
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
