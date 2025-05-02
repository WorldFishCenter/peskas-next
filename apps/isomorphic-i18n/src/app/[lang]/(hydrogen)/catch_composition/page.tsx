"use client";
import { useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { useSession } from "next-auth/react";
import type { DefaultSession } from "next-auth";
import type { TBmu } from "@repo/nosql/schema/bmu";
import FileStats from "@/app/shared/file/dashboard/file-stats";
import FishCompositionChart from "@/app/shared/file/dashboard/fish-composition-chart";

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

export default function CatchCompositionPage({ lang }: { lang?: string }) {
  // Use simple useState like in index.tsx
  const [selectedCategory, setSelectedCategory] = useState("Octopus");
  const [activeTab, setActiveTab] = useState("trends");
  const { t } = useTranslation("common");
  const { data: session } = useSession();

  // Use userBmu from session
  const userBmu = session?.user?.userBmu?.BMU;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-5 xl:gap-6">
        <FileStats lang={lang} bmu={userBmu} />
        <div className="grid grid-cols-12 gap-5 xl:gap-6">
          <div className="col-span-12">
            <FishCompositionChart 
              lang={lang} 
              bmu={userBmu} 
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
