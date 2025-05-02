"use client";

import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { Popover, PopoverContent, PopoverTrigger } from "@ui/popover";
import { Input } from "@ui/input";
import SimpleBar from "@ui/simplebar";
import { adminReferenceBmuAtom, useUserPermissions } from "../shared/file/dashboard/hooks/useUserPermissions";
import { api } from "@/trpc/react";
import { useTranslation } from "@/app/i18n/client";
import { ActionIcon } from "rizzui";
import { HiMiniStar } from "react-icons/hi2";
import cn from "@utils/class-names";

type BmuOption = {
  value: string;
  label: string;
  group: string;
};

type BmuGroup = {
  sectionName: string;
  units: BmuOption[];
};

export const AdminReferenceSelector = ({ lang }: { lang?: string }) => {
  const { t } = useTranslation(lang || "en", "common");
  const { isAdmin } = useUserPermissions();
  const [adminReferenceBmu, setAdminReferenceBmu] = useAtom(adminReferenceBmuAtom);
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const { data: bmus } = api.user.allBmus.useQuery();
  const [bmuGroups, setBmuGroups] = useState<BmuGroup[]>([]);
  
  // Format BMUs into groups
  useEffect(() => {
    if (!bmus || !bmus.length) return;
    
    const groupedBmus: Record<string, BmuOption[]> = {};
    
    // Group BMUs by region
    bmus.forEach(bmu => {
      if (!groupedBmus[bmu.group]) {
        groupedBmus[bmu.group] = [];
      }
      
      groupedBmus[bmu.group].push({
        value: bmu.BMU,
        label: bmu.BMU,
        group: bmu.group
      });
    });
    
    // Convert to array format
    const formattedGroups = Object.entries(groupedBmus).map(([group, units]) => ({
      sectionName: group,
      units
    }));
    
    setBmuGroups(formattedGroups);
  }, [bmus]);
  
  // Filter BMUs based on search
  const filteredGroups = bmuGroups.map(group => ({
    ...group,
    units: group.units.filter(unit => 
      !searchFilter || unit.label.toLowerCase().includes(searchFilter.toLowerCase())
    )
  })).filter(group => group.units.length > 0);
  
  // Only render for admin users
  if (!isAdmin) return null;
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <ActionIcon 
          variant="text"
          className={cn(
            "relative flex items-center justify-center h-[34px] w-[34px] rounded-full md:h-9 md:w-9",
            adminReferenceBmu ? "text-yellow-500" : "text-gray-500"
          )}
          title={t("text-select-reference-bmu") || "Select reference BMU"}
        >
          <HiMiniStar className="h-5 w-5 md:h-6 md:w-6" />
        </ActionIcon>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] sm:w-[350px]">
        <div className="mb-2">
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            {t("text-select-reference-bmu") || "Select Reference BMU"}
          </h4>
          <p className="text-xs text-gray-500">
            {t("text-reference-bmu-description") || "Select a BMU to use as reference in comparison charts"}
          </p>
        </div>
        
        <Input
          placeholder={t("text-search-bmus") || "Search BMUs..."}
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          className="mb-3"
        />
        
        <SimpleBar className="max-h-[300px]">
          <div className="space-y-3">
            {filteredGroups.map((group, index) => (
              <div key={`group-${index}`} className="space-y-1">
                <div className="font-medium text-sm text-gray-700">{group.sectionName}</div>
                <div className="ml-2 space-y-1">
                  {group.units.map(unit => (
                    <div 
                      key={unit.value}
                      className={cn(
                        "px-2 py-1 text-sm rounded cursor-pointer flex items-center",
                        adminReferenceBmu === unit.value 
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-gray-100"
                      )}
                      onClick={() => {
                        setAdminReferenceBmu(adminReferenceBmu === unit.value ? null : unit.value);
                        setIsOpen(false);
                      }}
                    >
                      {unit.label}
                      {adminReferenceBmu === unit.value && (
                        <HiMiniStar className="ml-auto text-yellow-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {filteredGroups.length === 0 && (
              <div className="text-gray-500 text-sm py-2 text-center">
                {t("text-no-bmus-found") || "No BMUs found"}
              </div>
            )}
          </div>
        </SimpleBar>
        
        {adminReferenceBmu && (
          <button
            className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
            onClick={() => setAdminReferenceBmu(null)}
          >
            {t("text-clear-selection") || "Clear selection"}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default AdminReferenceSelector; 