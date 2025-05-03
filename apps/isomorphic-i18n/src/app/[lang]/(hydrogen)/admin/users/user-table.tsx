"use client";

import type { TableOptions } from "@tanstack/react-table";
import { useAtom } from 'jotai';
import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

import type { RouterOutputs } from "@api/index";
import { MDTable } from "@ui/md-table";
import { Cell, Header } from "@ui/table";
import { modalStoreAtom, ModalEnum } from "@/store/modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@ui/dialog";
import { Button } from "@ui/button";
import { toast } from "@ui/toast";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

export const UserTable = ({
  users,
}: {
  users: RouterOutputs["user"]["all"];
}) => {
  const [ , setModal ] = useAtom(modalStoreAtom);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const utils = api.useUtils();

  const deleteUser = api.user.delete.useMutation({
    onSuccess: async () => {
      setIsDeleting(false);
      toast.success("User deleted successfully");
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      await utils.user.invalidate();
      router.refresh();
    },
    onError: (error) => {
      setIsDeleting(false);
      toast.error(error.message || "Failed to delete user");
      setDeleteConfirmOpen(false);
    }
  });

  const handleDeleteClick = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      setIsDeleting(true);
      deleteUser.mutate({ id: userToDelete.id });
    }
  };

  return (
    <>
      <MDTable
        data={users}
        cellClassName="p-1"
        paginationOptions={{ pageSize: 20 }}
        columns={[
          ...columns,
          {
            id: 'actions',
            meta: { name: "Actions", align: "center" },
            header: Header,
            cell: ({ row }) => (
              <div className="flex justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click event
                    handleDeleteClick(row.original._id, row.original.name);
                  }}
                  className="text-red-500 hover:text-red-700 transition-colors p-2 rounded hover:bg-red-50 flex items-center"
                  title="Delete user"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ),
            enableSorting: false,
          }
        ]}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{userToDelete?.name}</span>? 
              <p className="mt-2">This action will:</p>
              <ul className="list-disc pl-5 mt-1">
                <li>Remove the user from the system</li>
                <li>Revoke their access to the platform</li>
                <li>Delete all user-specific settings</li>
              </ul>
              <p className="mt-2 font-medium">This action cannot be undone.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
