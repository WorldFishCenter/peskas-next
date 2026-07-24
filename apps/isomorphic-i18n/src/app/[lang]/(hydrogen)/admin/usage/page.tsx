import { api } from "@/trpc/server";

import { UserUsageTable } from "./user-usage-table";

export default async function UserUsagePage() {
  let usage: Awaited<ReturnType<typeof api.usage.list>>;
  try {
    usage = await api.usage.list();
  } catch (error) {
    // The menu link is already permission-gated; if a non-admin reaches this
    // route directly, show a graceful notice instead of an error page.
    if ((error as { code?: string })?.code === "FORBIDDEN") {
      return (
        <div>
          <h1 className="text-2xl font-bold">User Usage Log</h1>
          <p className="mt-4 text-gray-600">
            You do not have access to this section.
          </p>
        </div>
      );
    }
    throw error;
  }

  return (
    <div>
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-2xl font-bold">User Usage Log</h1>
      </div>
      <UserUsageTable data={usage} />
    </div>
  );
}
