"use client";
import { useState } from "react";
import FileStats from "@/app/shared/file/dashboard/file-stats";
import CatchMonthly from "@/app/shared/file/dashboard/catch-ts";
import PerformanceTable from "@/app/shared/file/dashboard/file-list/table";
import GearTreemap from "@/app/shared/file/dashboard/gear-treemap";
import CatchRadarChart from "@/app/shared/file/dashboard/catch-radar";

type MetricKey = "mean_trip_catch" | "mean_effort" | "mean_cpue" | "mean_cpua";

export default function FileDashboard({ lang }: { lang?: string }) {
  const [selectedMetric, setSelectedMetric] =
    useState<MetricKey>("mean_trip_catch");

  return (
    <div className="@container">
      {/* General Stats Row */}
      <FileStats className="mb-5 2xl:mb-8" lang={lang} />
      
      {/* Charts Row */}
      <div className="mb-6 grid grid-cols-1 gap-6 @4xl:grid-cols-12 2xl:mb-8 2xl:gap-8">
        <CatchMonthly
          className="@container @4xl:col-span-8 @[96.937rem]:col-span-9"
          lang={lang}
          selectedMetric={selectedMetric}
          onMetricChange={setSelectedMetric}
        />
        <CatchRadarChart
          className="@4xl:col-span-4 @[96.937rem]:col-span-3"
          lang={lang}
          selectedMetric={selectedMetric}
        />
      </div>

      {/* Treemap Row */}
      <div className="mb-6 grid grid-cols-1 gap-6 @4xl:grid-cols-12 2xl:mb-8 2xl:gap-8">
        <GearTreemap
          className="@container @4xl:col-span-12 @[96.937rem]:col-span-12"
          lang={lang}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 @4xl:grid-cols-12 2xl:mb-8 2xl:gap-8">
        <PerformanceTable
          className="@container @4xl:col-span-12 @[96.937rem]:col-span-12"
          lang={lang}
        />
      </div>
    </div>
  );
}
