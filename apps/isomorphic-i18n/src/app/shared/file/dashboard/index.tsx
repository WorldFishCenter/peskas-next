"use client";
import { useState, useMemo } from "react";
import { useAtom } from "jotai";
import { useTranslation } from "@/app/i18n/client";
import { Select } from "rizzui";
import { PiCalendarBlank } from "react-icons/pi";
import CatchMetricsChart from "./catch-metrics";
import type { DefaultSession } from "next-auth";
import type { TBmu } from "@repo/nosql/schema/bmu";
import FileStats from "@/app/shared/file/dashboard/file-stats";
import FileStatsWBCIA from "@/app/shared/file/dashboard/file-stats-wbcia";
import GearTreemap from "@/app/shared/file/dashboard/gear-treemap";
import CatchRadarChart from "@/app/shared/file/dashboard/catch-radar";
import BMURanking from "@/app/shared/file/dashboard/bmu-ranking";
import IndividualFisherStats from "@/app/shared/file/dashboard/individual-fisher-stats";
import IndividualFisherTrends from "@/app/shared/file/dashboard/individual-fisher-trends";
import IndividualFisherGearPerformance from "@/app/shared/file/dashboard/individual-fisher-gear-performance";
import { selectedMetricAtom } from "@/app/components/filter-selector";
import { useUserPermissions } from "./hooks/useUserPermissions";

type SerializedBmu = {
  _id: string;
  BMU: string;
  group: string;
}

type CustomSession = {
  user?: {
    bmus?: Omit<TBmu, "lat" | "lng" | "treatments">[];
    userBmu?: SerializedBmu;
  } & DefaultSession["user"]
}

export default function FileDashboard({ lang }: { lang?: string }) {
  const [selectedMetric, setSelectedMetric] = useAtom(selectedMetricAtom);
  const [activeTab, setActiveTab] = useState("trends");
  const { t } = useTranslation("common");
  const { referenceBMU, isIiaUser, userFisherId, isWbciaUser } = useUserPermissions();
  
  const TIME_RANGE_OPTIONS = useMemo(() => [
    { value: '7', label: t('text-last-7-days') },
    { value: '30', label: t('text-last-30-days') },
    { value: '90', label: t('text-last-3-months') },
    { value: '180', label: t('text-last-6-months') },
    { value: 'all', label: t('text-all-time') },
  ], [t]);
  
  const [timeRange, setTimeRange] = useState(TIME_RANGE_OPTIONS[TIME_RANGE_OPTIONS.length - 1]); // Default to All time

  // Use reference BMU if available or fall back to user's BMU
  const effectiveBMU = referenceBMU || undefined;

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    if (timeRange.value === 'all') {
      return { startDate: null, endDate: new Date() };
    }
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange.value));
    
    return { startDate, endDate };
  }, [timeRange]);

  // If user is IIA, show individual fisher dashboard
  if (isIiaUser && userFisherId) {
    return (
      <div className="w-full space-y-5 xl:space-y-6">
        {/* Dashboard header with time range selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {t('text-your-performance')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('text-performance-description')}
            </p>
          </div>
          <Select
            variant="flat"
            value={timeRange.value}
            options={TIME_RANGE_OPTIONS}
            onChange={(option: any) => setTimeRange(option)}
            displayValue={(selected) =>
              TIME_RANGE_OPTIONS.find((option) => option.value === selected)?.label
            }
            selectClassName="h-10 min-w-[160px]"
            optionClassName="h-9"
            dropdownClassName="w-48 p-2 gap-1 grid"
            placement="bottom-end"
            prefix={
              <PiCalendarBlank className="h-4 w-4 text-gray-500" />
            }
            className="w-auto"
          />
        </div>
        
        {/* Dashboard content */}
        <div className="grid grid-cols-1 gap-5 xl:gap-6">
          {/* Individual fisher stats cards */}
          <IndividualFisherStats 
            lang={lang} 
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />
          
          {/* Individual fisher daily trends */}
          <IndividualFisherTrends 
            lang={lang}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />
          
          {/* Individual gear performance */}
          <IndividualFisherGearPerformance 
            lang={lang}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />
        </div>
      </div>
    );
  }

  // Default BMU-level dashboard for non-IIA users
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-5 xl:gap-6">
        {/* Use WBCIA version of FileStats for WBCIA users, regular version for others */}
        {isWbciaUser ? (
          <FileStatsWBCIA lang={lang} />
        ) : (
          <FileStats lang={lang} bmu={effectiveBMU} />
        )}
        <div className="grid grid-cols-12 gap-5 xl:gap-6">
          <div className="col-span-12 md:col-span-9">
            <CatchMetricsChart
              lang={lang}
              selectedMetric={selectedMetric}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              bmu={effectiveBMU}
            />
          </div>
          <div className="col-span-12 md:col-span-3">
            <CatchRadarChart 
              lang={lang} 
              bmu={effectiveBMU}
            />
          </div>
        </div>
        <GearTreemap lang={lang} bmu={effectiveBMU} />
        <BMURanking lang={lang} bmu={effectiveBMU} />
        {/* <PerformanceTable lang={lang} /> */}
      </div>
    </div>
  );
}