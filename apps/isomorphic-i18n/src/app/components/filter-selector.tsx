"use client";

import { ActionIcon, Checkbox, Input, Popover } from "rizzui";
import { TbFilterCog } from "react-icons/tb";
import { ChangeEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react"
import type { DefaultSession } from 'next-auth';
import find from 'lodash/find';
import get from 'lodash/get';
import values from 'lodash/values';
import isEmpty from 'lodash/isEmpty';
import { useAtom, atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import Fuse from "fuse.js";
import { MetricKey } from "@/app/shared/file/dashboard/charts/types";

import type { TBmu } from "@repo/nosql/schema/bmu";
import SimpleBar from '@ui/simplebar';
import useUserPermissions from "../shared/file/dashboard/hooks/useUserPermissions";
import { useTranslation } from "@/app/i18n/client";
import cn from "@utils/class-names";

type DropdownTypes = {
  sectionName: string;
  units: {
    value: string
  }[];
};

type CustomSession = {
  user?: {
    bmus?: Omit<TBmu, "lat" | "lng" | "treatments">[]
  }
}

const sessObjectToDropdown = (session: DefaultSession & CustomSession) => {
  return values(session.user?.bmus).reduce((prev: DropdownTypes[], cur:  Omit<TBmu, "lat" | "lng" | "treatments">) => 
    find(prev, { sectionName: cur.group })
    ?
      prev.map((item) => {
        if (item.sectionName === cur.group) {
        return {
            sectionName: cur.group,
            units: [
              ...(get(find(prev, { sectionName: cur.group }), 'units', [])),
              { value: cur.BMU }
            ]
          } as DropdownTypes        
        }

        return item
      })
    : 
      [
        ...prev,
        {
          sectionName: cur.group,
          units: [
            { value: cur.BMU }
          ]
        } as DropdownTypes
      ]
  , [])
}

export const dropdownAtom = atomWithStorage<DropdownTypes[]>('dropdown', [], undefined, { getOnInit: true });
export const bmusAtom = atomWithStorage<string[]>('bmus', [], undefined, { getOnInit: true });
export const viewModeAtom = atomWithStorage<'bmu' | 'region'>('viewMode', 'bmu', undefined, { getOnInit: true });

// Global metric selector atom
export const selectedMetricAtom = atom<MetricKey>("mean_effort");

export const FilterSelector = () => {
  const { t } = useTranslation("common");
  const [searchFilter, setSearchFilter] = useState("");
  const [filteredList, setFilteredList] = useState<DropdownTypes[] | string[]>([]);
  const [fuse, setFuse] = useState<Fuse<string>>();
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, status } = useSession();
  const [dropdown, setBmusDropdown] = useAtom(dropdownAtom);
  const [bmus, setBmus] = useAtom(bmusAtom);
  const [viewMode, setViewMode] = useAtom(viewModeAtom);
  const { isAdmin, adminReferenceBmu, setAdminReferenceBmu } = useUserPermissions();

  useEffect(() => {
    if (status === 'authenticated') {
      if (isEmpty(bmus) &&
        isEmpty(dropdown)
      ) {
        const dropdownData = sessObjectToDropdown(session)
        setFilteredList(dropdownData)
        setBmusDropdown(dropdownData)
        
        // For admin users, select one BMU per region by default regardless of view mode
        if (isAdmin) {
          const regionRepresentatives = dropdownData.map(region => {
            // Select the first BMU from each region
            return region.units[0].value;
          });
          setBmus(regionRepresentatives);
        } else {
          // For regular users, set all BMUs
          const newBmus = dropdownData.flatMap((section) =>
            section.units.map((unit) => unit.value)
          )
          setBmus(newBmus)
        }
        
        const allBmus = dropdownData.flatMap((section) =>
          section.units.map((unit) => unit.value)
        )
        setFuse(new Fuse(
          allBmus,
          {
            includeScore: true,
          }
        ))
      } else {
        setFilteredList(dropdown)
        setFuse(new Fuse(
          bmus,
          {
            includeScore: true,
          }
        ))
      }
    }

  }, [ session, status, bmus, dropdown, isAdmin, setBmus, setBmusDropdown ]);
  
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!fuse) return

    setSearchFilter(e.target.value);
    if (e.target.value) {
      const result = fuse.search(e.target.value);
      setFilteredList(result.map((res) => res.item));
    } else if (session) {
      setFilteredList(sessObjectToDropdown(session));
    }
  };

  // Function to handle view mode change
  const handleViewModeChange = (newMode: 'bmu' | 'region') => {
    if (viewMode === newMode) return;
    
    setViewMode(newMode);
    
    // If switching to region view, select one BMU from each region
    if (newMode === 'region' && session && dropdown.length > 0) {
      // Select representative BMUs from each region
      const regionRepresentatives = dropdown.map(region => {
        // Select the first BMU from each region
        return region.units[0].value;
      });
      
      setBmus(regionRepresentatives);
    }
  };

  return (
    <Popover isOpen={isOpen} setIsOpen={setIsOpen} placement="bottom-end">
      <Popover.Trigger>
        <ActionIcon variant="text" className="relative flex items-center justify-center h-[34px] w-[34px] rounded-full md:h-9 md:w-9">
          <TbFilterCog className="h-5 w-5 md:h-6 md:w-6 fill-[#D6D6D6] [stroke-width:1.5px]" />
        </ActionIcon>
      </Popover.Trigger>
      <Popover.Content className="w-[280px] sm:w-[350px]">
        {isAdmin && (
          <div className="mb-2">
            <div className="flex gap-2 bg-gray-100 p-1 rounded-md">
              <button
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm flex-1 transition-all",
                  viewMode === 'bmu' 
                    ? "bg-white shadow-sm text-primary font-medium" 
                    : "text-gray-600 hover:bg-gray-200"
                )}
                onClick={() => handleViewModeChange('bmu')}
              >
                BMU View
              </button>
              <button
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm flex-1 transition-all relative",
                  viewMode === 'region' 
                    ? "bg-white shadow-sm text-primary font-medium" 
                    : "text-gray-600 hover:bg-gray-200"
                )}
                onClick={() => handleViewModeChange('region')}
              >
                Region View
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-medium bg-yellow-100 text-yellow-800 rounded-full">Beta</span>
              </button>
            </div>
            
            {adminReferenceBmu && (
              <div className="flex justify-between items-center mt-2 text-xs">
                <span className="text-gray-500">Reference: <span className="text-yellow-600 font-medium">{adminReferenceBmu}</span></span>
                <button
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setAdminReferenceBmu(null)}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}
        
        <Input
          placeholder="Search BMUs..."
          value={searchFilter}
          onChange={handleSearchChange}
        />
        <div className="space-y-2 mt-2">
          <SimpleBar className="max-h-[300px] md:max-h-[600px]">
            {filteredList.map((section, idx) => {
              return (
                <FilterGroup
                  key={`bmu-section-${idx}`}
                  bmuSection={section}
                  searchFilter={searchFilter}
                  viewMode={viewMode}
                  referenceBmu={adminReferenceBmu}
                />
              );
            })}
          </SimpleBar>
        </div>
      </Popover.Content>
    </Popover>
  );
};

const FilterGroup = ({
  bmuSection,
  searchFilter,
  viewMode,
  referenceBmu
}: {
  bmuSection: DropdownTypes | string;
  searchFilter: string;
  viewMode?: 'bmu' | 'region';
  referenceBmu?: string | null;
}) => {
  const [bmus, setBmus] = useAtom(bmusAtom);
  const { data: session } = useSession();
  const { isAdmin, isCiaUser, setAdminReferenceBmu } = useUserPermissions();
  const { t } = useTranslation("common");

  const handleBmuSelect = (unit: string) => {
    // For the CIA group, ensure only one BMU is selectable
    if (isCiaUser) {
      setBmus([unit]);
      return;
    }
    
    // For region view in admin mode, ensure only one BMU is selected per region
    if (isAdmin && viewMode === 'region' && typeof bmuSection !== 'string') {
      const section = bmuSection as DropdownTypes;
      const regionName = section.sectionName;
      
      // Remove all other BMUs from this region
      const filteredBmus = bmus.filter(bmu => {
        // Check if this BMU is from a different region
        if (section.units.some(u => u.value === bmu)) {
          return false; // Remove BMUs from this region
        }
        return true; // Keep BMUs from other regions
      });
      
      // Add the newly selected BMU
      setBmus([...filteredBmus, unit]);
      return;
    }
    
    // Standard multi-select behavior for other cases
    if (bmus.includes(unit)) {
      setBmus(bmus.filter((filter) => filter !== unit));
    } else {
      setBmus([...bmus, unit]);
    }
  };
  
  const handleReferenceSelect = (unit: string) => {
    if (isAdmin) {
      // Toggle reference BMU
      setAdminReferenceBmu(referenceBmu === unit ? null : unit);
      
      // Also select the BMU if it's not already selected
      if (referenceBmu !== unit && !bmus.includes(unit)) {
        // For region view, we need to handle region selection differently
        if (viewMode === 'region' && typeof bmuSection !== 'string') {
          const section = bmuSection as DropdownTypes;
          
          // Remove all other BMUs from this region
          const filteredBmus = bmus.filter(bmu => {
            if (section.units.some(u => u.value === bmu)) {
              return false; // Remove BMUs from this region
            }
            return true; // Keep BMUs from other regions
          });
          
          // Add the newly selected BMU
          setBmus([...filteredBmus, unit]);
        } else {
          // Standard selection for BMU view
          setBmus([...bmus, unit]);
        }
      }
    }
  };

  if (typeof bmuSection === "string" && searchFilter) {
    const unit = bmuSection as string;
    const isReferenceBmu = referenceBmu === unit;

    return (
      <div className="flex items-center justify-between pr-2">
        <div className="flex-grow">
          <Checkbox
            key={unit}
            label={unit}
            checked={bmus.includes(unit)}
            onChange={() => handleBmuSelect(unit)}
          />
        </div>
        {isAdmin && (
          <button
            className={cn(
              "ml-4 text-lg flex-shrink-0 w-6 h-6 flex items-center justify-center", 
              isReferenceBmu ? "text-yellow-500" : "text-gray-300 hover:text-yellow-500"
            )}
            onClick={() => handleReferenceSelect(unit)}
            title="Set as reference"
          >
            ★
          </button>
        )}
      </div>
    );
  } else {
    const section = bmuSection as DropdownTypes;
    
    // In region view, we only check if any BMU from this region is selected
    const isRegionSelected = isAdmin && viewMode === 'region' 
      ? section.units.some(unit => bmus.includes(unit.value))
      : section.units.every(unit => bmus.includes(unit.value));

    const handleSectionSelect = () => {
      // For region view in admin mode, select only one BMU per region
      if (isAdmin && viewMode === 'region') {
        if (isRegionSelected) {
          // Remove all BMUs from this region
          setBmus(bmus.filter(bmu => !section.units.some(unit => unit.value === bmu)));
        } else {
          // Add the first BMU from this region, remove any others
          const filteredBmus = bmus.filter(bmu => !section.units.some(unit => unit.value === bmu));
          setBmus([...filteredBmus, section.units[0].value]);
        }
        return;
      }
      
      // Standard behavior for other cases
      if (isRegionSelected) {
        setBmus(
          bmus.filter(
            (filter) =>
              !section.units.flatMap((unit) => unit.value).includes(filter)
          )
        );
      } else {
        setBmus([
          ...bmus,
          ...section.units.map((unit) => unit.value),
        ]);
      }
    };

    // Check if this section has the reference BMU
    const hasReferenceBmu = referenceBmu && section.units.some(unit => unit.value === referenceBmu);

    return (
      <div>
        <div className="flex items-center">
          <Checkbox
            label={
              <span className={cn(
                hasReferenceBmu ? "text-yellow-600 font-medium" : ""
              )}>
                {section.sectionName}
                {hasReferenceBmu && <span className="ml-1 text-yellow-500">★</span>}
              </span>
            }
            checked={isRegionSelected}
            onChange={handleSectionSelect}
          />
        </div>
        <div className="mt-1 ml-6 space-y-1">
          {section.units.map((unit) => {
            // In region view for admin, only one BMU can be selected per region
            const disabled = isAdmin && viewMode === 'region' && isRegionSelected && 
              !bmus.includes(unit.value);
            
            // Check if this is the reference BMU
            const isReferenceBmu = referenceBmu === unit.value;
            
            return (
              <div key={unit.value} className="flex items-center justify-between pr-2">
                <div className="flex-grow">
                  <Checkbox
                    label={unit.value}
                    checked={bmus.includes(unit.value)}
                    onChange={() => handleBmuSelect(unit.value)}
                    disabled={disabled}
                    className={disabled ? "opacity-50" : ""}
                  />
                </div>
                {isAdmin && !disabled && (
                  <button
                    className={cn(
                      "ml-4 text-lg flex-shrink-0 w-6 h-6 flex items-center justify-center", 
                      isReferenceBmu ? "text-yellow-500" : "text-gray-300 hover:text-yellow-500"
                    )}
                    onClick={() => handleReferenceSelect(unit.value)}
                    title="Set as reference"
                  >
                    ★
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
};