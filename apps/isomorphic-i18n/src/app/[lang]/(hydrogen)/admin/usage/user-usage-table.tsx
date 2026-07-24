"use client";

import type { TableOptions, Table as TableType } from "@tanstack/react-table";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";

import type { RouterOutputs } from "@api/index";
import { api } from "@/trpc/react";
import { MDTable } from "@ui/md-table";
import { Cell, Header } from "@ui/table";
import { Button } from "@ui/button";
import { toast } from "@ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@ui/dialog";
import { sanitizeCsvValue } from "@utils/export-to-csv";
import { formatDate } from "@utils/format-date";

type UsageRow = RouterOutputs["usage"]["list"][number];

/** Human-readable duration from milliseconds, e.g. 3_930_000 -> "1h 5m". */
function formatDuration(ms: number): string {
  if (!ms || ms < 1000) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds && !hours) parts.push(`${seconds}s`);
  return parts.join(" ") || "0s";
}

/** Deterministic display date (shared dayjs formatter), em-dash when absent. */
function displayDate(date: Date | null): string {
  return date ? formatDate(date, "DD MMM YYYY, HH:mm") : "—";
}

/** ISO timestamp for CSV (sortable/parseable, no locale commas). */
function isoOrEmpty(date: Date | null): string {
  return date ? new Date(date).toISOString() : "";
}

const roleStyles: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  wbcia: "bg-green-100 text-green-700 border-green-200",
  aia: "bg-green-100 text-green-700 border-green-200",
  cia: "bg-blue-100 text-blue-700 border-blue-200",
  iia: "bg-blue-100 text-blue-700 border-blue-200",
  unknown: "bg-gray-100 text-gray-600 border-gray-200",
};

/** Shared destructive-confirmation dialog for the row/clear-all actions. */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
            <span className="mt-2 block font-medium">
              This action cannot be undone.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const UserUsageTable = ({ data }: { data: UsageRow[] }) => {
  const router = useRouter();
  const [rowToDelete, setRowToDelete] = useState<UsageRow | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const deleteRow = api.usage.delete.useMutation({
    onSuccess: () => {
      toast.success("Usage row deleted");
      setDeleteConfirmOpen(false);
      setRowToDelete(null);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete usage row");
      setDeleteConfirmOpen(false);
    },
  });

  const handleDeleteClick = (row: UsageRow) => {
    setRowToDelete(row);
    setDeleteConfirmOpen(true);
  };

  return (
    <>
      <MDTable
        data={data}
        tableName="user-usage-log"
        rowsName="sessions"
        cellClassName="p-1"
        paginationOptions={{ pageSize: 25 }}
        defaultSortingState={[{ id: "startedAt", desc: true }]}
        downloadCSV={downloadUsageLogCSV}
        columns={[
          ...columns,
          {
            id: "actions",
            meta: { name: "Actions", align: "center" },
            header: () => (
              <div className="text-center font-medium">Actions</div>
            ),
            cell: ({ row }) => (
              <div className="flex justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(row.original);
                  }}
                  className="flex items-center rounded p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                  title="Delete row"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ),
            enableSorting: false,
            enableHiding: false,
          },
        ]}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Usage Row"
        description={
          <>
            Delete this usage record
            {rowToDelete?.userName ? (
              <>
                {" "}
                for{" "}
                <span className="font-semibold">{rowToDelete.userName}</span>
              </>
            ) : rowToDelete?.userEmail ? (
              <>
                {" "}
                for{" "}
                <span className="font-semibold">{rowToDelete.userEmail}</span>
              </>
            ) : null}
            {rowToDelete?.startedAt
              ? ` (${displayDate(rowToDelete.startedAt)})`
              : ""}
            ?
          </>
        }
        confirmLabel="Delete"
        pendingLabel="Deleting..."
        isPending={deleteRow.isPending}
        onConfirm={() => {
          if (rowToDelete) deleteRow.mutate({ id: rowToDelete.id });
        }}
      />
    </>
  );
};

const columns: TableOptions<UsageRow>["columns"] = [
  {
    accessorKey: "startedAt",
    meta: { name: "Access (Started)", align: "center" },
    header: Header,
    sortingFn: "datetime",
    cell: ({ row }) => (
      <div className="flex items-center justify-center whitespace-nowrap">
        {displayDate(row.original.startedAt)}
      </div>
    ),
  },
  {
    accessorKey: "userName",
    accessorFn: (row) => row.userName ?? "—",
    meta: { name: "User", align: "center" },
    header: Header,
    cell: (cell) => <Cell {...cell} className="text-center" />,
  },
  {
    accessorKey: "userEmail",
    accessorFn: (row) => row.userEmail ?? "—",
    meta: { name: "Email", align: "center" },
    header: Header,
    cell: (cell) => <Cell {...cell} className="text-center" />,
  },
  {
    accessorKey: "role",
    meta: { name: "Role", align: "center" },
    header: Header,
    cell: ({ row }) => {
      const role = row.original.role ?? "unknown";
      return (
        <div className="flex items-center justify-center">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
              roleStyles[role.toLowerCase()] ?? roleStyles.unknown
            }`}
          >
            {role}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "bmu",
    accessorFn: (row) => row.bmu ?? "",
    meta: { name: "BMU", align: "center" },
    header: Header,
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        {row.original.bmu ? (
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {row.original.bmu}
          </span>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "activeMs",
    meta: { name: "Active Time", align: "center" },
    header: Header,
    cell: ({ row }) => (
      <div className="flex items-center justify-center whitespace-nowrap">
        {formatDuration(row.original.activeMs)}
      </div>
    ),
  },
  {
    accessorKey: "pageViews",
    meta: { name: "Page Views", align: "center" },
    header: Header,
    cell: (cell) => <Cell {...cell} className="text-center" />,
  },
  {
    accessorKey: "language",
    accessorFn: (row) => row.language ?? "—",
    meta: { name: "Lang", align: "center" },
    header: Header,
    cell: (cell) => <Cell {...cell} className="text-center" />,
  },
  {
    accessorKey: "lastSeenAt",
    meta: { name: "Last Seen", align: "center" },
    header: Header,
    sortingFn: "datetime",
    cell: ({ row }) => (
      <div className="flex items-center justify-center whitespace-nowrap">
        {displayDate(row.original.lastSeenAt)}
      </div>
    ),
  },
];

/**
 * Exports the current view (respecting the active search filter and sort, across
 * all pages) to a CSV file. Wired into MDTable's built-in "Download CSV" button.
 * Timestamps are ISO so the log can be pivoted into a time series downstream.
 */
function downloadUsageLogCSV({ table }: { table: TableType<UsageRow> }) {
  const csvColumns: { header: string; value: (row: UsageRow) => unknown }[] = [
    { header: "Started at (ISO)", value: (r) => isoOrEmpty(r.startedAt) },
    { header: "Last seen (ISO)", value: (r) => isoOrEmpty(r.lastSeenAt) },
    { header: "User", value: (r) => r.userName ?? "" },
    { header: "Email", value: (r) => r.userEmail ?? "" },
    { header: "Role", value: (r) => r.role ?? "" },
    { header: "BMU", value: (r) => r.bmu ?? "" },
    { header: "Fisher ID", value: (r) => r.fisherId ?? "" },
    { header: "Language", value: (r) => r.language ?? "" },
    { header: "Active time", value: (r) => formatDuration(r.activeMs) },
    { header: "Active ms", value: (r) => r.activeMs },
    { header: "Page views", value: (r) => r.pageViews },
    { header: "Session id", value: (r) => r.sessionId },
    { header: "User agent", value: (r) => r.userAgent ?? "" },
  ];

  const rows = table.getPrePaginationRowModel().rows.map((r) => r.original);
  const lines = [
    csvColumns.map((c) => sanitizeCsvValue(c.header)).join(","),
    ...rows.map((row) =>
      csvColumns.map((c) => sanitizeCsvValue(c.value(row))).join(",")
    ),
  ];

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `user-usage-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
