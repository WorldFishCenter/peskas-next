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
import { useAtom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import Fuse from "fuse.js";

import type { TBmu } from "@repo/nosql/schema/bmu";
import SimpleBar from '@ui/simplebar';

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

export const FilterSelector = () => {
  const [searchFilter, setSearchFilter] = useState("");
  const [filteredList, setFilteredList] = useState<DropdownTypes[] | string[]>([]);
  const [fuse, setFuse] = useState<Fuse<string>>();
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, status } = useSession()
  const [dropdown, setBmusDropdown] = useAtom(dropdownAtom);
  const [bmus, setBmus] = useAtom(bmusAtom);

  useEffect(() => {
    if (status === 'authenticated') {
      if (isEmpty(bmus) &&
        isEmpty(dropdown)
      ) {
        const dropdownData = sessObjectToDropdown(session)
        setFilteredList(dropdownData)
        setBmusDropdown(dropdownData)
        const newBmus = dropdownData.flatMap((section) =>
          section.units.map((unit) => unit.value)
        )
        setFuse(new Fuse(
          newBmus,
          {
            includeScore: true,
          }
        ))
        setBmus(newBmus)
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

  }, [ session, status, bmus, dropdown ]);
  
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

  return (
    <Popover isOpen={isOpen} setIsOpen={setIsOpen} placement="bottom-end">
      <Popover.Trigger>
        <ActionIcon variant="text" className="relative">
          <TbFilterCog className="h-6 w-6 fill-[#D6D6D6] [stroke-width:1.5px]" />
        </ActionIcon>
      </Popover.Trigger>
      <Popover.Content className="w-[350px]">
        <Input
          placeholder="Search here..."
          value={searchFilter}
          onChange={handleSearchChange}
        />
        <div className="space-y-2 mt-4">
          <SimpleBar className="max-h-[600px]">
            {filteredList.map((section, idx) => {
              return (
                <FilterGroup
                  key={`bmu-section-${idx}`}
                  bmuSection={section}
                  searchFilter={searchFilter}
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
}: {
  bmuSection: DropdownTypes | string;
  searchFilter: string;
}) => {
  const [bmus, setBmus] = useAtom(bmusAtom);

  const handleBmuSelect = (unit: string) => {
    if (bmus.includes(unit)) {
      setBmus(bmus.filter((filter) => filter !== unit));
    } else {
      setBmus([...bmus, unit]);
    }
  };

  if (typeof bmuSection === "string" && searchFilter) {
    const unit = bmuSection as string;

    return (
      <Checkbox
        key={unit}
        label={unit}
        checked={bmus.findIndex((filter) => filter === unit) !== -1}
        onChange={() => handleBmuSelect(unit)}
      />
    );
  } else {
    const section = bmuSection as DropdownTypes;
    const allSelected = section.units.every((unit) => {
      return bmus.includes(unit.value);
    });

    const handleSectionSelect = () => {
      if (allSelected) {
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

    return (
      <div>
        <Checkbox
          label={section.sectionName}
          checked={allSelected}
          onChange={handleSectionSelect}
        />
        <div className="mt-2 ml-8 space-y-2">
          {section.units.map((unit) => {
            return (
              <Checkbox
                key={unit.value}
                label={unit.value}
                checked={
                  bmus.findIndex((filter) => filter === unit.value) !== -1
                }
                onChange={() => handleBmuSelect(unit.value)}
              />
            );
          })}
        </div>
      </div>
    );
  }
};
