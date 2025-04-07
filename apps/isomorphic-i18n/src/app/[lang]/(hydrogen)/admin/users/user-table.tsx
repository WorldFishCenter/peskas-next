"use client";

import type { TableOptions } from "@tanstack/react-table";
import { useAtom } from 'jotai';

import type { RouterOutputs } from "@api/index";
import { MDTable } from "@ui/md-table";
import { Cell, Header } from "@ui/table";
import { modalStoreAtom, ModalEnum } from "@/store/modal";

export const UserTable = ({
  users,
}: {
  users: RouterOutputs["user"]["all"];
}) => {
  const [ , setModal ] = useAtom(modalStoreAtom)

  return (
    <MDTable
      data={users}
      cellClassName="p-1"
      paginationOptions={{ pageSize: 20 }}
      columns={columns}
      onRowClick={(row) => {
        setModal({
          open: true,
          type: ModalEnum.USER,
          data: { id: row.original._id}
        })
      }}
      rowClassName={(row) => {
        if (row.original.status === "inactive") {
          return "opacity-30";
        }
      }}
    />
  );
};

const columns: TableOptions<RouterOutputs["user"]["all"][number]>["columns"] = [
  {
    accessorKey: "name",
    meta: { name: "Name", align: "center" },
    header: Header,
    cell: (cell) => <Cell {...cell} className="text-center" />,
  },
  {
    accessorKey: "email",
    accessorFn: (row) => row.email,
    meta: { name: "Email", align: "center" },
    header: Header,
    cell: (cell) => <Cell {...cell} className="text-center" />,
  },
  {
    accessorKey: "userBmu",
    meta: { name: "User BMU", align: "center" },
    header: Header,
    cell: ({ row }) => {
      return (
        <div className="flex items-center justify-center">
          {row.original.userBmu ? (
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {row.original.userBmu.BMU}
            </span>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    meta: { name: "Role", align: "center" },
    header: Header,
    cell: ({ row }) => {
      const roleStyles = {
        admin: "bg-purple-100 text-purple-700 border-purple-200",
        control: "bg-blue-100 text-blue-700 border-blue-200",
        iia: "bg-blue-100 text-blue-700 border-blue-200",
        cia: "bg-blue-100 text-blue-700 border-blue-200",
        wbcia: "bg-green-100 text-green-700 border-green-200",
        aia: "bg-green-100 text-green-700 border-green-200",
      } as const;

      return (
        <div className="flex items-center justify-center">
          {row.original.groups.map((group) => (
            <span
              key={group._id}
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                roleStyles[group.name.toLowerCase() as keyof typeof roleStyles]
              }`}
            >
              {group.name}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    meta: { name: "Status", align: "center" },
    header: Header,
    cell: ({ row }) => {
      const statusStyles = {
        active: "bg-green-100 text-green-700 border-green-200",
        inactive: "bg-red-100 text-red-700 border-red-200",
      } as const;

      const statusLabels = {
        active: "Active",
        inactive: "Inactive",
      } as const;

      return (
        <div className="flex items-center justify-center">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
              statusStyles[row.original.status as keyof typeof statusStyles]
            }`}
          >
            {statusLabels[row.original.status as keyof typeof statusLabels]}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    accessorFn: (row) => row.created_at?.toLocaleDateString(),
    meta: { name: "Created At", align: "center" },
    header: Header,
    cell: (cell) => <Cell {...cell} className="text-center" />,
  },
];
