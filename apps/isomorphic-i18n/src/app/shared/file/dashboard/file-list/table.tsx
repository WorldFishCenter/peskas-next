"use client";

import { useMemo, useState } from "react";
import { useTable } from "@hooks/use-table";
import { Title } from "rizzui";
import { useTranslation } from "@/app/i18n/client";
import ControlledTable from "@/app/shared/controlled-table";
import { api } from "@/trpc/react";
import Table from "@/app/shared/table";

type ColumnType = {
  title: string;
  dataKey: string;
  width?: number;
  render?: (_: unknown, row: any) => React.ReactNode;
};

interface CatchTableData {
  id: string;
  bmu: string;
  mean_trip_catch: number;
  mean_effort: number;
  mean_cpue: number;
  mean_cpua: number;
  date: string;
}

export default function FileListTable({
  className,
  lang,
  selectedMetric,
}: {
  className?: string;
  lang?: string;
  selectedMetric: string;
}) {
  const [pageSize, setPageSize] = useState(10);
  const { t } = useTranslation(lang!, "table");

  const { data: monthlyData, isLoading: isDataLoading } =
    api.aggregatedCatch.monthly.useQuery();

  const transformedData: CatchTableData[] = useMemo(() => {
    if (!monthlyData) return [];

    return monthlyData.map((item: any, index: number) => ({
      id: index.toString(),
      bmu: "Kenyatta",
      date: new Date(item.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      }),
      mean_trip_catch: Number(item.mean_trip_catch?.toFixed(2)) || 0,
      mean_effort: Number(item.mean_effort?.toFixed(2)) || 0,
      mean_cpue: Number(item.mean_cpue?.toFixed(2)) || 0,
      mean_cpua: Number(item.mean_cpua?.toFixed(2)) || 0,
    }));
  }, [monthlyData]);

  const columns = useMemo<ColumnType[]>(
    () => [
      {
        title: "BMU",
        dataKey: "bmu",
        width: 150,
        render: (_: unknown, row: CatchTableData) => (
          <span className="font-medium">{row.bmu}</span>
        ),
      },
      {
        title: "Date",
        dataKey: "date",
        width: 200,
        render: (_: unknown, row: CatchTableData) => row.date,
      },
      {
        title: "Mean Catch (kg)",
        dataKey: "mean_trip_catch",
        width: 150,
        render: (_: unknown, row: CatchTableData) =>
          row.mean_trip_catch.toFixed(2),
      },
      {
        title: "Mean Effort (hours)",
        dataKey: "mean_effort",
        width: 150,
        render: (_: unknown, row: CatchTableData) => row.mean_effort.toFixed(2),
      },
      {
        title: "CPUE (kg/hour)",
        dataKey: "mean_cpue",
        width: 150,
        render: (_: unknown, row: CatchTableData) => row.mean_cpue.toFixed(2),
      },
      {
        title: "CPUA (kg/area)",
        dataKey: "mean_cpua",
        width: 150,
        render: (_: unknown, row: CatchTableData) => row.mean_cpua.toFixed(2),
      },
    ],
    []
  );

  const {
    isLoading,
    tableData,
    currentPage,
    totalItems,
    handlePaginate,
    sortConfig,
    handleSort,
  } = useTable(transformedData, pageSize);

  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between 2xl:mb-5">
        <Title
          as="h3"
          className="text-lg font-semibold text-gray-900 xl:text-xl"
        >
          {t("Catch Data by Month")}
        </Title>
      </div>
      <ControlledTable
        isLoading={isLoading || isDataLoading}
        data={tableData}
        columns={columns}
        scroll={{ x: 1300 }}
        variant="modern"
        tableLayout="fixed"
        className="overflow-hidden rounded-lg border border-muted text-sm"
        paginatorOptions={{
          pageSize,
          setPageSize,
          total: totalItems,
          current: currentPage,
          onChange: (page: number) => handlePaginate(page),
        }}
      />
    </div>
  );
}
