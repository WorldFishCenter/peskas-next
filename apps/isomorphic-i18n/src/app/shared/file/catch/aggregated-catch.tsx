"use client";

import { useEffect, useState } from "react";
import WidgetCard from "@components/cards/widget-card";
import { Title, Text, Badge } from "rizzui";
import cn from "@utils/class-names";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAtom } from 'jotai';

import { useMedia } from "@hooks/use-media";
import { CustomTooltip } from "@components/charts/custom-tooltip";
import TrendingUpIcon from "@components/icons/trending-up";
import SimpleBar from "@ui/simplebar";
import { useTranslation } from "@/app/i18n/client";
import { api } from "@/trpc/react";
import { useGlobalFilter } from "@/app/components/global-filter-provider";
import { bmusAtom } from "@/app/components/filter-selector";

function CustomYAxisTick({ x, y, payload }: any) {
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="end" className="fill-gray-500">
        {`${payload.value.toLocaleString()}`}KG
      </text>
    </g>
  );
}

interface DataItem {
  date: string;
  [key: string]: string | number;
}

export default function AggregatedCatch({
  className,
  lang,
}: {
  className?: string;
  lang?: string;
}) {
  const { bmuFilter } = useGlobalFilter();
  const [data, setData] = useState<DataItem[]>([]);
  const isMobile = useMedia("(max-width: 768px)", false);
  const isDesktop = useMedia("(max-width: 1440px)", false);
  const is2xl = useMedia("(max-width: 1780px)", false);
  const isTablet = useMedia("(max-width: 800px)", false);
  const { t } = useTranslation(lang!, "common");
  const [bmus] = useAtom(bmusAtom);

  const { data: monthlyData } = api.aggregatedCatch.monthly.useQuery({ bmus });

  useEffect(() => {
    if (!monthlyData) return

    try {
      // Transform data to fit the format for Recharts
      const formattedData = monthlyData.reduce((acc: DataItem[], item: any) => {
        const dateKey = new Date(item._id.landing_date)
          .toISOString()
          .split("T")[0];
        const existingEntry = acc.find((entry) => entry.date === dateKey);
        if (existingEntry) {
          existingEntry[item._id.fish_category] = item.catch_kg;
        } else {
          acc.push({
            date: dateKey,
            [item._id.fish_category]: item.catch_kg,
          });
        }
        return acc;
      }, []);
      setData(formattedData);
    } catch (error) {
      console.error("Failed to fetch data:", (error as Error).message);
    }
  }, [ monthlyData ]);

  const fishCategories = [
    "Rest of catch",
    "Scavengers",
    "Rabbitfish",
    "Parrotfish",
  ];
  const colors = ["#282ECA", "#4052F6", "#96C0FF", "#DEEAFC"];

  const totalCatch = data.reduce((sum, item) => {
    const itemTotal = Object.entries(item).reduce((acc, [key, value]) => {
      if (key !== "date" && typeof value === "number") {
        return acc + value;
      }
      return acc;
    }, 0);
    return sum + itemTotal;
  }, 0);

  return (
    <WidgetCard
      title={t("text-total-catch")}
      titleClassName="font-normal text-gray-700 sm:text-base font-inter"
      description={
        <div className="flex items-center justify-start">
          <Title as="h2" className="me-2 font-semibold">
            {totalCatch.toFixed(2)} KG
          </Title>
          <Text className="flex items-center leading-none text-gray-500">
            <Text
              as="span"
              className={cn(
                "me-2 inline-flex items-center font-medium text-green"
              )}
            >
              <TrendingUpIcon className="me-1 h-4 w-4" />
              32.40%
            </Text>
            {t("text-last-year")}
          </Text>
        </div>
      }
      descriptionClassName="text-gray-500 mt-1.5"
      action={
        <div className="hidden @2xl:block">
          {fishCategories.map((category, index) => (
            <span key={category} className="mr-4">
              <Badge renderAsDot className={`me-0.5 bg-[${colors[index]}]`} />
              {category}
            </span>
          ))}
        </div>
      }
      className={className}
    >
      <SimpleBar>
        <div className="h-96 w-full pt-9">
          <ResponsiveContainer
            width="100%"
            height="100%"
            {...(isTablet && { minWidth: "700px" })}
          >
            <BarChart
              data={data}
              barSize={isMobile ? 16 : isDesktop ? 28 : is2xl ? 32 : 46}
              margin={{
                left: 16,
              }}
              className="[&_.recharts-tooltip-cursor]:fill-opacity-20 dark:[&_.recharts-tooltip-cursor]:fill-opacity-10 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500 [&_.recharts-cartesian-axis.yAxis]:-translate-y-3 rtl:[&_.recharts-cartesian-axis.yAxis]:-translate-x-12 [&_.recharts-cartesian-grid-vertical]:opacity-0"
            >
              <CartesianGrid strokeDasharray="8 10" strokeOpacity={0.435} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={<CustomYAxisTick />}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {fishCategories.map((category, index) => (
                <Bar
                  key={category}
                  dataKey={category}
                  stackId="a"
                  fill={colors[index]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SimpleBar>
    </WidgetCard>
  );
}
