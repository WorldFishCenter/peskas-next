"use client";
import { useState, useMemo } from "react";
import { useAtom } from "jotai";
import { useTranslation } from "@/app/i18n/client";
import type { DefaultSession } from "next-auth";
import type { TBmu } from "@repo/nosql/schema/bmu";
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
import { selectedTimeRangeAtom, bmusAtom } from "@/app/components/filter-selector";
import { Text, Collapse } from "rizzui";
import { PiUser, PiCaretDownBold } from "react-icons/pi";
import cn from "@utils/class-names";

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
  
  // Use the same permission patterns as homepage
  const { 
    referenceBMU, 
    isIiaUser, 
    userFisherId, 
    isWbciaUser, 
    shouldShowUnifiedDashboard, 
    isAdminFisher,
    shouldShowIndividualData,
    canSeeBMUData 
  } = useUserPermissions();
  
  const [selectedTimeRange] = useAtom(selectedTimeRangeAtom);
  const [bmus] = useAtom(bmusAtom); // Get the BMU array for charts

  // Use reference BMU like homepage - consistent pattern
  const effectiveBMU = referenceBMU || undefined;

  // Only recalculate when selectedTimeRange changes - memoize dates to prevent loops
  const { startDate: memoStartDate, endDate: memoEndDate, startDateObj, endDateObj } = useMemo(() => {
    const end = new Date();
    const start = getTimeRangeStartDate(selectedTimeRange, end);
    return {
      startDate: start ? start.toISOString() : undefined,
      endDate: end.toISOString(),
      startDateObj: start,
      endDateObj: end,
    };
  }, [selectedTimeRange]);

  // Fetch individual data for users who should see individual data (IIA users and admin-fishers)
  const { individualFishDistribution, isLoadingIndividualFishDistribution } = useIndividualData({
    startDate: startDateObj || undefined,
    endDate: endDateObj
  });

  // Get BMU name from individual data for BMU-specific queries
  const bmuName = useMemo(() => {
    if (!shouldShowIndividualData || !individualFishDistribution || individualFishDistribution.length === 0) return undefined;
    return individualFishDistribution[0]?.landing_site;
  }, [individualFishDistribution, shouldShowIndividualData]);

  // Fetch all individual fish distribution for the BMU (for peers comparison)
  const { data: allBmuIndividualData, isLoading: isLoadingBmuData } = api.individualData.individualFishDistributionByBMU.useQuery(
    {
      bmu: bmuName || "",
      startDate: memoStartDate,
      endDate: memoEndDate,
    },
    { enabled: shouldShowIndividualData && !!bmuName }
  );





  // Loading state for individual data users
  const isLoadingIndividualCharts = shouldShowIndividualData && (isLoadingIndividualFishDistribution || isLoadingBmuData);

  // If user is pure IIA, show only individual fisher dashboard (like homepage)
  if (isIiaUser && userFisherId && !isAdminFisher) {
    return (
      <div className="w-full">
        <div className="grid grid-cols-1 gap-5 xl:gap-6">
          <div className="grid grid-cols-12 gap-5 xl:gap-6">
            <div className="col-span-12">
              {isLoadingIndividualCharts || !allBmuIndividualData ? (
                <div className="h-96 w-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">{t("text-loading")}</span>
                  </div>
                </div>
              ) : (
                <IndividualFishCompositionChart
                  allData={allBmuIndividualData}
                  userFisherId={userFisherId || ""}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  bmuName={bmuName || ""}
                  title={t("text-fish-composition-trends-absolute")}
                  description={t("text-fish-composition-trends-absolute-desc")}
                />
              )}
            </div>
            <div className="col-span-12">
              {isLoadingIndividualCharts || !allBmuIndividualData ? (
                <div className="h-96 w-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">{t("text-loading")}</span>
                  </div>
                </div>
              ) : (
                <IndividualFishCompositionComparison
                  allData={allBmuIndividualData}
                  userFisherId={userFisherId || ""}
                  bmuName={bmuName || ""}
                  title={t("text-fish-composition-comparison")}
                  description={t("text-fish-composition-comparison-desc")}
                />
              )}
            </div>
            <div className="col-span-12">
              {isLoadingIndividualCharts || !allBmuIndividualData ? (
                <div className="h-96 w-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">{t("text-loading")}</span>
                  </div>
                </div>
              ) : (
                <IndividualFishCompositionAreaChart
                  allData={allBmuIndividualData}
                  userFisherId={userFisherId || ""}
                  bmuName={bmuName || ""}
                  title={t("text-fish-composition-area-chart-title")}
                  description={t("text-fish-composition-area-chart-desc")}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default BMU-level dashboard with optional individual section for admin-fishers (like homepage)
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-5 xl:gap-6">
        
        {/* Individual Fisher Performance Integration for Administrator-Fishers */}
        {shouldShowUnifiedDashboard && (
          <div className="bg-gradient-to-r from-blue-100 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
            <Collapse
              defaultOpen={false}
              className="px-6 py-6"
              header={({ open, toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  className="flex w-full cursor-pointer items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-xl shadow-sm">
                      <PiUser className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <Text className="text-xl font-bold text-gray-900">
                        {t('text-your-fishing-performance')}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {t('text-personal-fishing-insights-alongside-management')}
                      </Text>
                    </div>
                  </div>
                  <PiCaretDownBold
                    className={cn(
                      "h-5 w-5 -rotate-90 transform transition-transform duration-300 text-gray-500 rtl:rotate-90",
                      open && "rotate-0 rtl:rotate-0"
                    )}
                  />
                </button>
              )}
            >
              <div className="space-y-6 pt-6">
                <div className="grid grid-cols-12 gap-5 xl:gap-6">
                  <div className="col-span-12">
                    {isLoadingIndividualCharts || !allBmuIndividualData ? (
                      <div className="h-96 w-full flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                          <span className="text-sm text-gray-500">{t("text-loading")}</span>
                        </div>
                      </div>
                    ) : (
                      <IndividualFishCompositionChart
                        allData={allBmuIndividualData}
                        userFisherId={userFisherId || ""}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                        bmuName={bmuName || ""}
                        title={t("text-fish-composition-trends-absolute")}
                        description={t("text-fish-composition-trends-absolute-desc")}
                      />
                    )}
                  </div>
                  <div className="col-span-12">
                    {isLoadingIndividualCharts || !allBmuIndividualData ? (
                      <div className="h-96 w-full flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                          <span className="text-sm text-gray-500">{t("text-loading")}</span>
                        </div>
                      </div>
                    ) : (
                      <IndividualFishCompositionComparison
                        allData={allBmuIndividualData}
                        userFisherId={userFisherId || ""}
                        bmuName={bmuName || ""}
                        title={t("text-fish-composition-comparison")}
                        description={t("text-fish-composition-comparison-desc")}
                      />
                    )}
                  </div>
                </div>
              </div>
            </Collapse>
          </div>
        )}

        {/* BMU-level charts for users who can see BMU data */}
        {canSeeBMUData && bmus.length > 0 && (
          <div className="grid grid-cols-12 gap-5 xl:gap-6">
            <div className="col-span-12">
              <FishCompositionChart 
                lang={lang}
                bmu={effectiveBMU} 
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
            <div className="col-span-12">
              <FishCompositionComparison
                lang={lang}
                bmu={effectiveBMU}
              />
            </div>
            <div className="col-span-12">
              <FishCompositionAreaChart
                lang={lang}
                bmu={effectiveBMU}
              />
            </div>
          </div>
        )}

        {/* Show message if no BMUs available */}
        {canSeeBMUData && bmus.length === 0 && (
          <div className="col-span-12 h-96 w-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-medium text-gray-900 mb-2">
                {t("text-no-bmus-selected")}
              </div>
              <div className="text-sm text-gray-500">
                {t("text-please-select-bmus-from-filter")}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}