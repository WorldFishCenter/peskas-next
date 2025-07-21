"use client";
import { useState, useMemo } from "react";
import { useAtom } from "jotai";
import { useTranslation } from "@/app/i18n/client";
import type { DefaultSession } from "next-auth";
import type { TBmu } from "@repo/nosql/schema/bmu";
import FileStats from "@/app/shared/file/dashboard/file-stats";
import FishCompositionChart from "@/app/shared/file/dashboard/fish-composition-chart";
import FishCompositionComparison from "@/app/shared/file/dashboard/fish-composition-comparison";
import FishCompositionAreaChart from "@/app/shared/file/dashboard/fish-composition-area-chart";
import IndividualFishCompositionChart from "@/app/shared/file/dashboard/IndividualFishCompositionChart";
import IndividualFishCompositionComparison from "@/app/shared/file/dashboard/IndividualFishCompositionComparison";
import IndividualFishCompositionAreaChart from "@/app/shared/file/dashboard/IndividualFishCompositionAreaChart";
import { useUserPermissions } from "@/app/shared/file/dashboard/hooks/useUserPermissions";
import { useIndividualData } from "@/app/shared/file/dashboard/hooks/useIndividualData";
import { api } from "@/trpc/react";
import { getTimeRangeStartDate } from "@/app/shared/file/dashboard/utils/timeRangeFilter";
import { selectedTimeRangeAtom } from "@/app/components/filter-selector";

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

// Fix for Next.js 14: Use proper param typing for app router pages
interface PageProps {
  params: {
    lang: string;
  };
}

export default function CatchCompositionPage({ params }: PageProps) {
  const lang = params.lang;
  // Use the same state management pattern as the homepage FileDashboard
  const [selectedCategory, setSelectedCategory] = useState<string>("Octopus");
  const [activeTab, setActiveTab] = useState("trends");
  const { t } = useTranslation("common");
  const { userFisherId, isIiaUser } = useUserPermissions();
  const [selectedTimeRange] = useAtom(selectedTimeRangeAtom);
  const endDate = new Date();
  const startDate = getTimeRangeStartDate(selectedTimeRange, endDate);

  // Use reference BMU instead of directly using userBmu from session - consistent with homepage
  const effectiveBMU = undefined; // No longer needed as BMU is fetched from individual data

  // Fetch individual data for IIA users
  const { individualFishDistribution, isLoadingIndividualFishDistribution } = useIndividualData();
  // Fetch all individual fish distribution for the BMU (for peers)
  const bmuName = useMemo(() => {
    if (!individualFishDistribution || individualFishDistribution.length === 0) return undefined;
    return individualFishDistribution[0]?.landing_site;
  }, [individualFishDistribution]);
  // Only recalculate when selectedTimeRange changes
  const { startDate: memoStartDate, endDate: memoEndDate } = useMemo(() => {
    const end = new Date();
    const start = getTimeRangeStartDate(selectedTimeRange, end);
    return {
      startDate: start ? start.toISOString() : undefined,
      endDate: end.toISOString(),
    };
  }, [selectedTimeRange]);

  const { data: allBmuIndividualData } = api.individualData.individualFishDistributionByBMU.useQuery(
    {
      bmu: bmuName || "",
      startDate: memoStartDate,
      endDate: memoEndDate,
    },
    { enabled: !!bmuName && isIiaUser }
  );

  // Helper: group individual data by month and category for chart components
  function processIndividualFishDistribution(data: any[]) {
    // Group by month and category
    const grouped: Record<string, Record<string, number>> = {};
    data.forEach((item) => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) grouped[monthKey] = {};
      const cat = item.fish_category || 'Unknown';
      if (!grouped[monthKey][cat]) grouped[monthKey][cat] = 0;
      grouped[monthKey][cat] += item.total_catch_kg || 0;
    });
    // Convert to array for charting
    return Object.entries(grouped).map(([monthKey, cats]) => {
      const [year, month] = monthKey.split('-');
      const displayMonth = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
      return {
        displayMonth,
        ...cats,
      };
    });
  }

  // Split data for 'you' and 'others'
  const youData = useMemo(() =>
    allBmuIndividualData ? allBmuIndividualData.filter((d: any) => d.fisher_id === userFisherId) : [],
    [allBmuIndividualData, userFisherId]
  );
  const othersData = useMemo(() =>
    allBmuIndividualData ? allBmuIndividualData.filter((d: any) => d.fisher_id !== userFisherId) : [],
    [allBmuIndividualData, userFisherId]
  );
  const youChartData = processIndividualFishDistribution(youData);
  const othersChartData = processIndividualFishDistribution(othersData);

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-5 xl:gap-6">
        {/* <FileStats lang={lang} bmu={effectiveBMU} /> */}
        <div className="grid grid-cols-12 gap-5 xl:gap-6">
          <div className="col-span-12">
            {isIiaUser
              ? (allBmuIndividualData
                  ? <IndividualFishCompositionChart
                      allData={allBmuIndividualData}
                      userFisherId={userFisherId || ""}
                      selectedCategory={selectedCategory}
                      setSelectedCategory={setSelectedCategory}
                      bmuName={bmuName || ""}
                      title={t("text-fish-composition-trends-absolute")}
                      description={t("text-fish-composition-trends-absolute-desc")}
                    />
                  : <div className="h-96 w-full flex items-center justify-center"><span className="text-sm text-gray-500">{t("text-loading")}</span></div>
                )
              : <FishCompositionChart 
                  lang={lang}
                  bmu={effectiveBMU} 
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
            }
          </div>
          <div className="col-span-12">
            {isIiaUser
              ? (allBmuIndividualData
                  ? <IndividualFishCompositionComparison
                      allData={allBmuIndividualData}
                      userFisherId={userFisherId || ""}
                      bmuName={bmuName || ""}
                      title={t("text-fish-composition-comparison")}
                      description={t("text-fish-composition-comparison-desc")}
                    />
                  : <div className="h-96 w-full flex items-center justify-center"><span className="text-sm text-gray-500">{t("text-loading")}</span></div>
                )
              : <FishCompositionComparison
                  lang={lang}
                  bmu={effectiveBMU}
                />
            }
          </div>
          <div className="col-span-12">
            {isIiaUser
              ? (allBmuIndividualData
                  ? <IndividualFishCompositionAreaChart
                      allData={allBmuIndividualData}
                      userFisherId={userFisherId || ""}
                      bmuName={bmuName || ""}
                      title={t("text-fish-composition-area-chart-title")}
                      description={t("text-fish-composition-area-chart-desc")}
                    />
                  : <div className="h-96 w-full flex items-center justify-center"><span className="text-sm text-gray-500">{t("text-loading")}</span></div>
                )
              : <FishCompositionAreaChart
                  lang={lang}
                  bmu={effectiveBMU}
                  {...(isIiaUser && youChartData ? { chartData: youChartData, isIiaUser: true } : {})}
                />
            }
          </div>
        </div>
      </div>
    </div>
  );
}