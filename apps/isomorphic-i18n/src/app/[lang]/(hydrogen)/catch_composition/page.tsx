"use client";
import { useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import type { DefaultSession } from "next-auth";
import type { TBmu } from "@repo/nosql/schema/bmu";
import FileStats from "@/app/shared/file/dashboard/file-stats";
import FishCompositionChart from "@/app/shared/file/dashboard/fish-composition-chart";
import FishCompositionComparison from "@/app/shared/file/dashboard/fish-composition-comparison";
import { useUserPermissions } from "@/app/shared/file/dashboard/hooks/useUserPermissions";

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

// Fix for Next.js 14: Use proper param typing for app router pages
interface PageProps {
  params: {
    lang: string;
  };
}

export default function CatchCompositionPage({ params }: PageProps) {
  const lang = params.lang;
  // Use simple useState like in index.tsx
  const [selectedCategory, setSelectedCategory] = useState("Octopus");
  const [activeTab, setActiveTab] = useState("trends");
  const { t } = useTranslation("common");
  const { referenceBMU } = useUserPermissions();

  // Use reference BMU instead of directly using userBmu from session
  const effectiveBMU = referenceBMU || undefined;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-5 xl:gap-6">
        <div className="grid grid-cols-12 gap-5 xl:gap-6">
          <div className="col-span-12">
            <FishCompositionChart 
              lang={lang}
              bmu={effectiveBMU} 
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
          
          <div className="col-span-12">
            <FishCompositionComparison
              lang={lang}
              bmu={effectiveBMU}
            />
          </div>
        </div>
      </div>
    </div>
  );
}