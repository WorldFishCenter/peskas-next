"use client";

import { useMemo, useState } from "react";
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
  avgCatch: number;
  avgEffort: number;
  avgCPUE: number;
  avgCPUA: number;
  totalCatch: number;
  monthlyData: Array<{
    date: string;
    mean_trip_catch: number;
    mean_effort: number;
    mean_cpue: number;
    mean_cpua: number;
  }>;
  catchPerformance: number;
  effortPerformance: number;
  cpuePerformance: number;
  cpuaPerformance: number;
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
      <Tooltip content={`This value is ${value.toFixed(1)}% of the top-performing BMU's value.`}>
        <Info className="h-4 w-4" />
      </Tooltip>
    </div>
  );
};

// A helper component similar to HeaderCell from your provided code:
function SortableHeader({
  title,
  sortable,
  isCurrentColumn,
  direction,
}: {
  title: React.ReactNode;
  sortable?: boolean;
  isCurrentColumn: boolean;
  direction?: 'asc' | 'desc';
}) {
  return (
    <div className={cn("flex items-center gap-1", sortable && "cursor-pointer")}>
      <span>{title}</span>
      {sortable && (
        <div className="inline-flex items-center">
          {direction === undefined && (
            // Neutral state: show both arrows to indicate sortable column
            <div className="flex flex-col items-center text-gray-400">
              {/* Up Arrow */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                className="h-auto w-3"
                viewBox="0 0 16 16"
              >
                <path d="m7.247 4.86-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659L8.753 4.86a1 1 0 0 0-1.506 0z"/>
              </svg>
              {/* Down Arrow */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                className="h-auto w-3"
                viewBox="0 0 16 16"
              >
                <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
              </svg>
            </div>
          )}
          {direction === 'asc' && (
            // Ascending arrow (already sorted ascending)
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              className="h-auto w-3"
              viewBox="0 0 16 16"
            >
              <path d="m7.247 4.86-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659L8.753 4.86a1 1 0 0 0-1.506 0z"/>
            </svg>
          )}
          {direction === 'desc' && (
            // Descending arrow (already sorted descending)
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              className="h-auto w-3"
              viewBox="0 0 16 16"
            >
              <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

export default function PerformanceTable({
  className,
  lang,
}: {
  className?: string;
  lang?: string;
}) {
  const [pageSize, setPageSize] = useState(10);
  const { t } = useTranslation(lang!, "table");
  const [bmus] = useAtom(bmusAtom);

  const { data: performanceData, isLoading: isDataLoading } = 
    api.aggregatedCatch.performance.useQuery({ bmus });

  const {
    tableData,
    isLoading,
    totalItems,
    currentPage,
    handlePaginate,
    sortConfig,
    handleSort,
  } = useTable(performanceData || [], pageSize);

  const columns = useMemo<ColumnType[]>(
    () => [
      {
        title: (
          <SortableHeader
            title={t("BMU")}
            sortable={true}
            isCurrentColumn={sortConfig.key === "bmu"}
            direction={sortConfig.key === "bmu" ? sortConfig.direction : undefined}
          />
        ),
        dataKey: "bmu",
        width: 150,
        sortable: true,
        onHeaderCell: () => ({
          onClick: () => handleSort("bmu"),
        }),
        render: (_: unknown, row: PerformanceData) => (
          <div className="space-y-1">
            <span className="font-medium">{row.bmu}</span>
            <div className="text-xs text-gray-500">
              {`Total: ${(row.totalCatch / 1000).toFixed(2)} tons`}
            </div>
          </div>
        ),
      },
      {
        title: (
          <SortableHeader
            title={t("Catch Performance")}
            sortable={true}
            isCurrentColumn={sortConfig.key === "avgCatch"}
            direction={sortConfig.key === "avgCatch" ? sortConfig.direction : undefined}
          />
        ),
        dataKey: "avgCatch",
        width: 180,
        sortable: true,
        onHeaderCell: () => ({
          onClick: () => handleSort("avgCatch"),
        }),
        render: (_: unknown, row: PerformanceData) => (
          <div className="space-y-1">
            <div className="font-medium flex items-center gap-1">
              {row.avgCatch.toFixed(1)} kg
            </div>
            <PerformanceIndicator value={row.catchPerformance} />
          </div>
        ),
      },
      {
        title: (
          <SortableHeader
            title={t("CPUE")}
            sortable={true}
            isCurrentColumn={sortConfig.key === "avgCPUE"}
            direction={sortConfig.key === "avgCPUE" ? sortConfig.direction : undefined}
          />
        ),
        dataKey: "avgCPUE",
        width: 180,
        sortable: true,
        onHeaderCell: () => ({
          onClick: () => handleSort("avgCPUE"),
        }),
        render: (_: unknown, row: PerformanceData) => (
          <div className="space-y-1">
            <div className="font-medium flex items-center gap-1">
              {row.avgCPUE.toFixed(1)} kg/hour
            </div>
            <PerformanceIndicator value={row.cpuePerformance} />
          </div>
        ),
      },
      {
        title: (
          <SortableHeader
            title={t("Effort")}
            sortable={true}
            isCurrentColumn={sortConfig.key === "avgEffort"}
            direction={sortConfig.key === "avgEffort" ? sortConfig.direction : undefined}
          />
        ),
        dataKey: "avgEffort",
        width: 180,
        sortable: true,
        onHeaderCell: () => ({
          onClick: () => handleSort("avgEffort"),
        }),
        render: (_: unknown, row: PerformanceData) => (
          <div className="space-y-1">
            <div className="font-medium flex items-center gap-1">
              {row.avgEffort.toFixed(1)} hours
            </div>
            <PerformanceIndicator value={row.effortPerformance} />
          </div>
        ),
      },
      {
        title: t("6-Month Trend"),
        dataKey: "trend",
        width: 200,
        render: (_: unknown, row: PerformanceData) => (
          <div className="h-12">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={row.monthlyData.slice(-6)}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <Bar dataKey="mean_trip_catch" fill={BAR_COLOR} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ),
      },
    ],
    [t, sortConfig, handleSort]
  );

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between gap-4">
        <Title as="h3" className="text-lg font-semibold text-gray-900 xl:text-xl">
          {t("BMU Performance Rankings")}
        </Title>
        <div className="text-sm text-gray-500">
          {t("Based on last 6 months of data")}
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
