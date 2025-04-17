"use client";
import { useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { MetricKey } from "./charts/types"; 
import CatchMetricsChart from "./catch-metrics";
import { useSession } from "next-auth/react";
import type { DefaultSession } from "next-auth";
import type { TBmu } from "@repo/nosql/schema/bmu";
import FileStats from "@/app/shared/file/dashboard/file-stats";
import PerformanceTable from "@/app/shared/file/dashboard/file-list/table";
import GearTreemap from "@/app/shared/file/dashboard/gear-treemap";
import CatchRadarChart from "@/app/shared/file/dashboard/catch-radar";

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
  const [selectedMetricKey, setSelectedMetricKey] = useState<MetricKey>("mean_effort");
  const [activeTab, setActiveTab] = useState("trends");
  const { t } = useTranslation("common");
  const { data: session } = useSession();

  // Use userBmu from session
  const userBmu = session?.user?.userBmu?.BMU;

  return (
    <div className="w-full">
      {/* <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
          {t("text-file-dashboard-title")}
        </h2>
      </div> */}

      <div className="grid grid-cols-1 gap-5 xl:gap-6">
        <FileStats lang={lang} bmu={userBmu} />
        <div className="grid grid-cols-12 gap-5 xl:gap-6">
          <div className="col-span-12 md:col-span-9">
            <CatchMetricsChart
              lang={lang}
              selectedMetric={selectedMetricKey}
              onMetricChange={setSelectedMetricKey}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              bmu={userBmu}
            />
          </div>
          <div className="col-span-12 md:col-span-3">
            <CatchRadarChart 
              lang={lang} 
              selectedMetric={selectedMetricKey}
              bmu={userBmu}
            />
          </div>
        </div>
        <GearTreemap lang={lang} bmu={userBmu} />
        <PerformanceTable lang={lang} />
      </div>
    </div>
  );
}
