"use client";

import { useMemo, useState, useCallback } from "react";
import { useTable } from "@hooks/use-table";
import { Title, Tooltip } from "rizzui";
import { useTranslation } from "@/app/i18n/client";
import ControlledTable from "@/app/shared/controlled-table";
import { api } from "@/trpc/react";
import { BarChart, Bar, ResponsiveContainer } from "recharts";
import { useAtom } from "jotai";
import { bmusAtom } from "@/app/components/filter-selector";
import cn from "@utils/class-names";
import { Info } from "lucide-react";
import MetricCard from "@components/cards/metric-card";
import { useSession } from "next-auth/react";

type ColumnType = {
  title: React.ReactNode;
  dataKey: string;
  width?: number;
  sortable?: boolean;
  onHeaderCell?: () => { onClick: () => void };
  render?: (_: unknown, row: any) => React.ReactNode;
};

interface PerformanceData {
  bmu: string;
  avgEffort: number;
  avgCPUE: number;
  avgCPUA: number;
  avgRPUE: number;
  avgRPUA: number;
  monthlyData: Array<{
    date: string;
    mean_effort: number;
    mean_cpue: number;
    mean_cpua: number;
    mean_rpue: number;
    mean_rpua: number;
  }>;
  effortPerformance: number;
  cpuePerformance: number;
  cpuaPerformance: number;
  rpuePerformance: number;
  rpuaPerformance: number;
}

const BAR_COLOR = "#0c526e";

const PerformanceIndicator = ({ value }: { value: number }) => {
  let color;
  if (value >= 80) color = "text-green-600";
  else if (value >= 50) color = "text-yellow-600";
  else color = "text-red-600";

  return (
    <div className={cn("text-xs font-medium flex items-center gap-2", color)}>
      <span>{value.toFixed(1)}% of top BMU</span>
      <Tooltip
        content={`This value is ${value.toFixed(1)}% of the top-performing BMU`}
      >
        <Info className="h-4 w-4" />
      </Tooltip>
    </div>
  );
};

function SortableHeader({
  title,
  sortable,
  isCurrentColumn,
  direction,
}: {
  title: React.ReactNode;
  sortable?: boolean;
  isCurrentColumn: boolean;
  direction?: "asc" | "desc";
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1",
        sortable && "cursor-pointer hover:opacity-80"
      )}
    >
      <span>{title}</span>
      {sortable && (
        <div className="inline-flex items-center">
          {direction === undefined && (
            <div className="flex flex-col items-center text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                className="h-auto w-3"
                viewBox="0 0 16 16"
              >
                <path d="m7.247 4.86-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659L8.753 4.86a1 1 0 0 0-1.506 0z" />
              </svg>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                className="h-auto w-3"
                viewBox="0 0 16 16"
              >
                <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
              </svg>
            </div>
          )}
          {direction === "asc" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              className="h-auto w-3"
              viewBox="0 0 16 16"
            >
              <path d="m7.247 4.86-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659L8.753 4.86a1 1 0 0 0-1.506 0z" />
            </svg>
          )}
          {direction === "desc" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              className="h-auto w-3"
              viewBox="0 0 16 16"
            >
              <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

const LoadingState = () => {
  return (
    <MetricCard
      title=""
      metric=""
      rounded="lg"
      chart={
        <div className="h-24 w-24 @[16.25rem]:h-28 @[16.25rem]:w-32 @xs:h-32 @xs:w-36 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Loading chart...</span>
          </div>
        </div>
      }
      chartClassName="flex flex-col w-auto h-auto text-center justify-center"
      className="min-w-[292px] w-full max-w-full flex flex-col items-center justify-center"
    />
  );
};

export default function PerformanceTable({
  className,
  lang,
  bmu,
}: {
  className?: string;
  lang?: string;
  bmu?: string;
}) {
  const [pageSize, setPageSize] = useState(10);
  const { t } = useTranslation(lang!, "table");
  const [bmus] = useAtom(bmusAtom);
  const { data: session } = useSession();
  const { data: performanceData, isLoading: isDataLoading } =
    api.aggregatedCatch.performance.useQuery({ bmus });

  // Move all hooks before the conditional return
  const memoizedData = useMemo(() => performanceData || [], [performanceData]);

  const {
    tableData,
    isLoading,
    totalItems,
    currentPage,
    handlePaginate,
    sortConfig,
    handleSort,
  } = useTable(memoizedData, pageSize);

  const memoizedHandleSort = useCallback((key: string) => {
    handleSort(key);
  }, [handleSort]);
  
  // Move columns definition before the conditional return
  const columns = useMemo<ColumnType[]>(
    () => [
      {
        title: (
          <div className="flex flex-col items-center w-full">
            <SortableHeader
              title="BMU"
              sortable={true}
              isCurrentColumn={sortConfig.key === "bmu"}
              direction={
                sortConfig.key === "bmu" ? sortConfig.direction : undefined
              }
            />
          </div>
        ),
        dataKey: "bmu",
        width: 150,
        sortable: true,
        onHeaderCell: () => ({
          onClick: () => memoizedHandleSort("bmu"),
        }),
        render: (_: unknown, row: PerformanceData) => (
          <div className="space-y-1 text-center">
            <span className="font-medium">{row.bmu}</span>
          </div>
        ),
      },
      {
        title: (
          <div className="flex flex-col items-center w-full">
            <SortableHeader
              title={t("text-metrics-effort")}
              sortable={true}
              isCurrentColumn={sortConfig.key === "avgEffort"}
              direction={
                sortConfig.key === "avgEffort"
                  ? sortConfig.direction
                  : undefined
              }
            />
            <span className="text-[11px] font-light text-gray-400">
              fishers/km²/day
            </span>
          </div>
        ),
        dataKey: "avgEffort",
        width: 180,
        sortable: true,
        onHeaderCell: () => ({
          onClick: () => memoizedHandleSort("avgEffort"),
        }),
        render: (_: unknown, row: PerformanceData) => (
          <div className="space-y-1 text-center">
            <div className="font-medium flex items-center justify-center gap-1">
              {typeof row.avgEffort === "number"
                ? row.avgEffort.toFixed(1)
                : "N/A"}
            </div>
            <div className="flex justify-center">
              <PerformanceIndicator value={row.effortPerformance ?? 0} />
            </div>
          </div>
        ),
      },
      {
        title: (
          <div className="flex flex-col items-center w-full">
            <SortableHeader
              title={t("text-metrics-catch-rate")}
              sortable={true}
              isCurrentColumn={sortConfig.key === "avgCPUE"}
              direction={
                sortConfig.key === "avgCPUE" ? sortConfig.direction : undefined
              }
            />
            <span className="text-[11px] font-light text-gray-400">
              kg/fisher/day
            </span>
          </div>
        ),
        dataKey: "avgCPUE",
        width: 180,
        sortable: true,
        onHeaderCell: () => ({
          onClick: () => memoizedHandleSort("avgCPUE"),
        }),
        render: (_: unknown, row: PerformanceData) => (
          <div className="space-y-1 text-center">
            <div className="font-medium flex items-center justify-center gap-1">
              {typeof row.avgCPUE === "number" ? row.avgCPUE.toFixed(1) : "N/A"}
            </div>
            <div className="flex justify-center">
              <PerformanceIndicator value={row.cpuePerformance ?? 0} />
            </div>
          </div>
        ),
      },
      {
        title: (
          <div className="flex flex-col items-center w-full">
            <SortableHeader
              title={t("text-metrics-catch-density")}
              sortable={true}
              isCurrentColumn={sortConfig.key === "avgCPUA"}
              direction={
                sortConfig.key === "avgCPUA" ? sortConfig.direction : undefined
              }
            />
            <span className="text-[11px] font-light text-gray-400">
              kg/km²/day
            </span>
          </div>
        ),
        dataKey: "avgCPUA",
        width: 180,
        sortable: true,
        onHeaderCell: () => ({
          onClick: () => memoizedHandleSort("avgCPUA"),
        }),
        render: (_: unknown, row: PerformanceData) => (
          <div className="space-y-1 text-center">
            <div className="font-medium flex items-center justify-center gap-1">
              {typeof row.avgCPUA === "number" ? row.avgCPUA.toFixed(1) : "N/A"}
            </div>
            <div className="flex justify-center">
              <PerformanceIndicator value={row.cpuaPerformance ?? 0} />
            </div>
          </div>
        ),
      },
      {
        title: (
          <div className="flex flex-col items-center w-full">
            <SortableHeader
              title={t("text-metrics-fisher-revenue")}
              sortable={true}
              isCurrentColumn={sortConfig.key === "avgRPUE"}
              direction={
                sortConfig.key === "avgRPUE" ? sortConfig.direction : undefined
              }
            />
            <span className="text-[11px] font-light text-gray-400">
              KSH/fisher/day
            </span>
          </div>
        ),
        dataKey: "avgRPUE",
        width: 180,
        sortable: true,
        onHeaderCell: () => ({
          onClick: () => memoizedHandleSort("avgRPUE"),
        }),
        render: (_: unknown, row: PerformanceData) => (
          <div className="space-y-1 text-center">
            <div className="font-medium flex items-center justify-center gap-1">
              {typeof row.avgRPUE === "number" ? row.avgRPUE.toFixed(1) : "N/A"}
            </div>
            <div className="flex justify-center">
              <PerformanceIndicator value={row.rpuePerformance ?? 0} />
            </div>
          </div>
        ),
      },
      {
        title: (
          <div className="flex flex-col items-center w-full">
            <SortableHeader
              title={t("text-metrics-area-revenue")}
              sortable={true}
              isCurrentColumn={sortConfig.key === "avgRPUA"}
              direction={
                sortConfig.key === "avgRPUA" ? sortConfig.direction : undefined
              }
            />
            <span className="text-[11px] font-light text-gray-400">
              KSH/km²/day
            </span>
          </div>
        ),
        dataKey: "avgRPUA",
        width: 180,
        sortable: true,
        onHeaderCell: () => ({
          onClick: () => memoizedHandleSort("avgRPUA"),
        }),
        render: (_: unknown, row: PerformanceData) => (
          <div className="space-y-1 text-center">
            <div className="font-medium flex items-center justify-center gap-1">
              {typeof row.avgRPUA === "number" ? row.avgRPUA.toFixed(1) : "N/A"}
            </div>
            <div className="flex justify-center">
              <PerformanceIndicator value={row.rpuaPerformance ?? 0} />
            </div>
          </div>
        ),
      }
    ],
    [t, sortConfig, memoizedHandleSort]
  );

  // Check if user is in CIA mode
  const isCiaUser = session?.user?.groups?.some(
    (group: { name: string }) => group.name === 'CIA'
  );

  // If in CIA mode, don't render the table as it doesn't make sense to show a comparison
  // table with just one BMU
  if (isCiaUser) {
    return null;
  }

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between gap-4">
        <Title
          as="h3"
          className="text-lg font-semibold text-gray-900 xl:text-xl"
        >
          {t("text-metrics-performance-rankings")}
        </Title>
        <div className="text-sm text-gray-500">
          {t("text-metrics-based-on-last-6-months")}
        </div>
      </div>

      <ControlledTable
        isLoading={isLoading || isDataLoading}
        data={tableData}
        columns={columns}
        scroll={{ x: 900 }}
        variant="modern"
        className="overflow-hidden rounded-lg border border-muted text-sm"
        paginatorOptions={{
          pageSize,
          setPageSize,
          total: totalItems,
          current: currentPage,
          onChange: handlePaginate,
        }}
        rowKey="bmu"
      />
    </div>
  );
}
