"use client";
import { useState } from "react";
import { useAtom } from "jotai";
import { useTranslation } from "@/app/i18n/client";
import CatchMetricsChart from "../../analytics/bmu/components/bmu-catch-metrics";
import type { DefaultSession } from "next-auth";
import type { TBmu } from "@repo/nosql/schema/bmu";
import FileStats from "@/app/shared/file/dashboard/file-stats";
import FileStatsWBCIA from "@/app/shared/file/dashboard/file-stats-wbcia";
import GearTreemap from "../../analytics/gear/components/gear-treemap";
import CatchRadarChart from "../../analytics/bmu/components/bmu-radar-chart";
import BMURanking from "../../analytics/bmu/components/bmu-ranking";
import IndividualFisherStats from "../../analytics/individual/components/fisher-stats";
import IndividualFisherTrends from "../../analytics/individual/components/fisher-trends";
import IndividualFisherGearPerformance from "../../analytics/individual/components/fisher-gear-performance";
import { selectedMetricAtom } from "@/app/components/filter-selector";
import { useUserPermissions } from "../../analytics/core/hooks/use-user-permissions";
import PageHeader from '@/app/shared/page-header';
import { PiUser, PiCaretDownBold } from "react-icons/pi";
import { Text, Collapse } from "rizzui";
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

export default function FileDashboard({ lang }: { lang?: string }) {
  const [selectedMetric, setSelectedMetric] = useAtom(selectedMetricAtom);
  const [activeTab, setActiveTab] = useState("trends");
  const { t } = useTranslation("common");
  const { referenceBMU, userBMU, isIiaUser, userFisherId, isWbciaUser, shouldShowUnifiedDashboard, isAdminFisher } = useUserPermissions();

  // Use reference BMU if available or fall back to user's BMU
  const effectiveBMU = referenceBMU || userBMU;

  // If user is IIA, show individual fisher dashboard
  if (isIiaUser && userFisherId) {
    const pageHeader = {
      title: 'text-your-performance',
      breadcrumb: [
        { name: 'text-home', href: '/' },
        { name: 'text-your-performance' },
      ],
    };
    return (
      <div className="w-full space-y-5 xl:space-y-6">
        <PageHeader title={pageHeader.title} breadcrumb={pageHeader.breadcrumb} lang={lang} />
        {/* No metric selector or filter controls in IIA mode */}
        {/* Dashboard content */}
        <div className="grid grid-cols-1 gap-5 xl:gap-6">
          {/* Individual fisher stats cards */}
          <IndividualFisherStats lang={lang} />
          {/* Individual fisher daily trends */}
          <IndividualFisherTrends lang={lang} />
          {/* Individual gear performance */}
          <IndividualFisherGearPerformance lang={lang} />
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
                {/* Individual Fisher Performance Statistics */}
                <IndividualFisherStats lang={lang} />
                {/* Individual Fisher Performance Trends */}
                <IndividualFisherTrends lang={lang} />
              </div>
            </Collapse>
          </div>
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
      </div>
    </div>
  );
}