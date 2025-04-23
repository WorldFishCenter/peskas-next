"use client";

import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useMemo, useState } from "react";
import find from 'lodash/find';
import get from 'lodash/get';
import values from 'lodash/values';
import groupBy from 'lodash/groupBy';

import { UpsertUserSchema } from "@/validators/user.schema";
import { Button } from "@ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@ui/form2";
import { Input } from "@ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@ui/popover";
import { Checkbox } from "rizzui";
import SimpleBar from '@ui/simplebar';
import { toast } from "@ui/toast";
import cn from "@utils/class-names";
import { Z_INDEX } from "@utils/common/constants";

import type { DataType } from "@/store/modal";
import type { TBmu } from "@repo/nosql/schema/bmu";

import { ModalEnum, modalStoreAtom } from "@/store/modal";
import { api } from "@/trpc/react";
import { VirtualizedCombobox } from "../virtualizer-searchbar";

// Custom CSS to fix dropdown positioning issues
const customStyles = `
  .dialog-content {
    position: relative;
    display: flex;
    flex-direction: column;
    max-height: 80vh !important;
  }

  .dropdown-container {
    position: static;
  }

  .dropdown-container .popover-content {
    position: absolute;
    max-height: 180px !important;
    overflow-y: auto !important;
    z-index: 100;
  }
  
  .dropdown-container .command-group {
    max-height: 140px !important;
  }

  /* Prevent dropdowns from extending beyond bottom of screen */
  .bmu-dropdown {
    top: auto !important;
    bottom: 100px !important;
  }

  /* Show list above if at bottom of modal */
  .user-bmu-dropdown {
    top: auto !important;
    bottom: 40px !important;
    max-height: 300px !important;
    overflow-y: auto !important;
  }

  /* Adjust internal list height */
  .dropdown-container [style*="height: 300px"] {
    height: 180px !important;
  }
  
  /* BMU filter dropdown styles */
  .bmu-filter-dropdown {
    width: 100%;
    padding: 0.5rem;
    max-height: 350px;
  }
  
  .bmu-filter-content {
    max-height: 280px;
    overflow-y: auto;
    width: 100%;
    margin-top: 0.5rem;
  }
  
  .bmu-section {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    border-radius: 0.375rem;
  }
  
  .bmu-section:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }
  
  .bmu-section-items {
    margin-top: 0.5rem;
    margin-left: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .bmu-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.5rem 1rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    height: 2.5rem;
  }
  
  /* Filter group component styles */
  .filter-group-section {
    font-weight: 600;
    padding: 4px 0;
  }
  
  .filter-group-item {
    padding: 2px 0;
    margin-left: 1.5rem;
  }
`;

// Type definitions for BMU related data
type BmuOption = {
  value: string;
  label: string;
  group?: string;
};

type BmuGrouped = {
  sectionName: string;
  units: BmuOption[];
};

// Modified to match the format used in filter-selector
const formatBmusForGroups = (bmus: any[] | undefined) => {
  if (!bmus || !bmus.length) return [];
  
  // Group BMUs by their group property
  const grouped = groupBy(bmus, 'group');
  
  // Convert to array of groups with their BMUs
  return Object.entries(grouped).map(([groupName, groupBmus]) => ({
    sectionName: groupName,
    units: groupBmus.map(bmu => ({
      value: bmu._id.toString(),
      label: bmu.BMU,
      group: bmu.group
    }))
  }));
};

// Filter section component for single selection
const FilterGroup = ({
  section,
  selectedBmu,
  onSelectBmu,
}: {
  section: BmuGrouped;
  selectedBmu: string | undefined;
  onSelectBmu: (bmuId: string) => void;
}) => {
  return (
    <div className="bmu-section">
      <div className="font-medium text-sm mb-1">{section.sectionName}</div>
      <div className="bmu-section-items">
        {section.units.map(unit => (
          <div 
            key={unit.value} 
            className={cn(
              "px-2 py-1 rounded cursor-pointer hover:bg-gray-100 flex items-center", 
              selectedBmu === unit.value ? "bg-primary/10 text-primary font-medium" : ""
            )}
            onClick={() => onSelectBmu(unit.value)}
          >
            {unit.label}
            {selectedBmu === unit.value && (
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 16 16" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="ml-auto"
              >
                <path 
                  d="M6.00016 10.7998L3.20016 7.9998L2.26683 8.9998L6.00016 12.7332L14.0002 4.7332L13.0002 3.7332L6.00016 10.7998Z" 
                  fill="currentColor"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Filter section component for BMUs (multiple selection with regions)
const BmusFilterGroup = ({
  section,
  selectedBmus,
  onSelectBmu,
  onSelectSection,
}: {
  section: BmuGrouped;
  selectedBmus: string[];
  onSelectBmu: (bmuId: string) => void;
  onSelectSection: (sectionName: string, bmuIds: string[]) => void;
}) => {
  // Check if all BMUs in this section are selected
  const allSelected = section.units.every(unit => 
    selectedBmus.includes(unit.value)
  );

  // Handle selecting or deselecting the entire section
  const handleSectionSelect = () => {
    const sectionBmuIds = section.units.map(unit => unit.value);
    onSelectSection(section.sectionName, sectionBmuIds);
  };

  return (
    <div className="bmu-section mb-3">
      <Checkbox
        label={section.sectionName}
        checked={allSelected}
        onChange={handleSectionSelect}
        className="font-medium text-gray-800"
      />
      <div className="bmu-section-items">
        {section.units.map(unit => (
          <Checkbox
            key={unit.value}
            label={unit.label}
            checked={selectedBmus.includes(unit.value)}
            onChange={() => onSelectBmu(unit.value)}
            className="text-sm"
          />
        ))}
      </div>
    </div>
  );
};

export default function UserModal({
  data,
}: {
  data?: DataType[ModalEnum.USER];
}) {
  const utils = api.useUtils();
  const { data: bmus } = api.user.allBmus.useQuery();
  const { data: user } = data?.id
    ? api.user.byId.useQuery({ id: data.id })
    : { data: null };
  const router = useRouter();
  const [, setModal] = useAtom(modalStoreAtom);
  const modalRef = useRef<HTMLDivElement>(null);
  const [bmuOpen, setBmuOpen] = useState(false);
  const [selectedBmu, setSelectedBmu] = useState<string | undefined>(undefined);
  const [searchFilter, setSearchFilter] = useState('');
  
  // States for BMUs multi-select with regional filtering
  const [bmusOpen, setBmusOpen] = useState(false);
  const [selectedBmus, setSelectedBmus] = useState<string[]>([]);
  const [bmusSearchFilter, setBmusSearchFilter] = useState('');

  // Organize BMUs by group using the format from filter-selector
  const groupedBmus: BmuGrouped[] = useMemo(() => 
    formatBmusForGroups(bmus), [bmus]
  );

  // Flatten grouped BMUs for use with VirtualizedCombobox
  const flatBmuOptions = useMemo(() => {
    if (!groupedBmus || !groupedBmus.length) return [];
    return groupedBmus.flatMap(group => 
      group.units.map(bmu => ({
        value: bmu.value,
        label: `${bmu.label} (${group.sectionName})`, // Include group in label for context
        group: group.sectionName
      }))
    );
  }, [groupedBmus]);

  // Filter BMUs based on search query
  const filteredBmuGroups = useMemo(() => {
    if (!searchFilter.trim() || !groupedBmus.length) return groupedBmus;
    
    // Filter BMUs that match the search query
    return groupedBmus.map(group => ({
      ...group,
      units: group.units.filter(unit => 
        unit.label.toLowerCase().includes(searchFilter.toLowerCase())
      )
    })).filter(group => group.units.length > 0); // Only keep groups with matching BMUs
  }, [groupedBmus, searchFilter]);

  // Filter BMUs for multi-select dropdown
  const filteredBmuGroupsForMultiSelect = useMemo(() => {
    if (!bmusSearchFilter.trim() || !groupedBmus.length) return groupedBmus;
    
    // Filter BMUs that match the search query
    return groupedBmus.map(group => ({
      ...group,
      units: group.units.filter(unit => 
        unit.label.toLowerCase().includes(bmusSearchFilter.toLowerCase())
      )
    })).filter(group => group.units.length > 0); // Only keep groups with matching BMUs
  }, [groupedBmus, bmusSearchFilter]);

  const form = useForm({
    schema: UpsertUserSchema,
    defaultValues: {
      _id: user?._id?.toString() ?? undefined,
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      role: user?.role ?? "",
      status: user?.status ?? "active",
      bmuNames:
        user?.bmus?.map((bmu) => ({
          value: bmu._id.toString(),
          label: bmu.BMU,
        })) ?? [],
      userBmu: user?.userBmu ? {
        value: user.userBmu._id?.toString() ?? "",
        label: user.userBmu.BMU ?? "",
      } : undefined,
    },
  });

  // Initialize selectedBmu from user's userBmu if it exists
  useEffect(() => {
    if (user?.userBmu) {
      setSelectedBmu(user.userBmu._id.toString());
    }
  }, [user]);

  // Initialize selectedBmus from user's bmus if they exist
  useEffect(() => {
    if (user?.bmus && user.bmus.length > 0) {
      setSelectedBmus(user.bmus.map(bmu => bmu._id.toString()));
    }
  }, [user]);

  useEffect(() => {
    form.reset({
      _id: user?._id?.toString() ?? undefined,
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      role: user?.role ?? "",
      status: user?.status ?? "active",
      bmuNames:
        user?.bmus?.map((bmu) => ({
          value: bmu._id.toString(),
          label: bmu.BMU,
        })) ?? [],
      userBmu: user?.userBmu ? {
        value: user.userBmu._id?.toString() ?? "",
        label: user.userBmu.BMU ?? "",
      } : undefined,
    });
  }, [form, user]);

  // Handle selecting a single BMU
  const handleBmuSelect = (bmuId: string) => {
    // Select only this BMU (single selection)
    setSelectedBmu(bmuId);
    
    // Close the dropdown after selection
    setBmuOpen(false);
  };

  // Handler for selecting/deselecting a single BMU in the BMUs field
  const handleBmusSelect = (bmuId: string) => {
    if (selectedBmus.includes(bmuId)) {
      setSelectedBmus(selectedBmus.filter(id => id !== bmuId));
    } else {
      setSelectedBmus([...selectedBmus, bmuId]);
    }
  };

  // Handler for selecting/deselecting an entire section in the BMUs field
  const handleBmusSectionSelect = (sectionName: string, sectionBmuIds: string[]) => {
    const allSelected = sectionBmuIds.every(id => selectedBmus.includes(id));
    
    if (allSelected) {
      // Remove all BMUs in this section
      setSelectedBmus(selectedBmus.filter(id => !sectionBmuIds.includes(id)));
    } else {
      // Add all BMUs in this section that aren't already selected
      const newBmus = sectionBmuIds.filter(id => !selectedBmus.includes(id));
      setSelectedBmus([...selectedBmus, ...newBmus]);
    }
  };

  // Update form data when selected BMUs change
  useEffect(() => {
    // Map selected BMU IDs to objects with value and label
    const bmuObjects = selectedBmus.map(id => {
      const bmu = flatBmuOptions.find(option => option.value === id);
      return {
        value: id,
        label: bmu ? bmu.label.split(' (')[0] : id,
      };
    });
    
    form.setValue('bmuNames', bmuObjects);
  }, [selectedBmus, flatBmuOptions, form]);

  // Update form data when selected BMU changes
  useEffect(() => {
    if (selectedBmu) {
      // Find the BMU from flat options
      const bmuOption = flatBmuOptions.find(bmu => bmu.value === selectedBmu);
      if (bmuOption) {
        form.setValue('userBmu', {
          value: bmuOption.value,
          label: bmuOption.label.split(' (')[0], // Remove group suffix
        });
      }
    } else {
      // If no BMU selected, clear userBmu field
      form.setValue('userBmu', undefined);
    }
  }, [selectedBmu, flatBmuOptions, form]);

  const upsertUser = api.user.upsert.useMutation({
    onSuccess: async () => {
      await utils.user.invalidate();
      setModal({ open: false, type: "" });
      toast.success("Successfully updated user");
      router.refresh();
    },
    onError: (err) => {
      toast.error(
        err?.data?.code === "UNAUTHORIZED"
          ? "You must be logged in to update users"
          : "Failed to update user"
      );
    },
  });

  // Function to modify the popup position to stay within viewport
  const handleDropdownOpen = (dropdown: string) => {
    if (typeof window === 'undefined') return;
    
    // Give time for the popup to render
    setTimeout(() => {
      // Find all popovers
      const popovers = document.querySelectorAll('.popover-content');
      
      popovers.forEach(popover => {
        // Add appropriate class based on dropdown type
        if (dropdown === 'bmus') {
          popover.classList.add('bmu-dropdown');
        } else if (dropdown === 'user-bmu') {
          popover.classList.add('user-bmu-dropdown');
        }
      });
    }, 10);
  };

  // Get the display text for the selected BMU
  const getSelectedBmuText = () => {
    if (!selectedBmu) {
      return "Select a BMU";
    }
    
    const bmu = flatBmuOptions.find(b => b.value === selectedBmu);
    return bmu ? bmu.label.split(' (')[0] : "Select a BMU";
  };

  return (
    <>
      <style>{customStyles}</style>
      <Dialog
        open={true}
        onOpenChange={() =>
          setModal({
            open: false,
            type: "",
          })
        }
      >
        <DialogContent
          ref={modalRef}
          style={{ zIndex: Z_INDEX.HOW_TO_JOIN_MODAL }}
          className={cn(
            "max-w-[90%] rounded-lg bg-muted lg:max-w-[500px]",
            "overflow-y-auto dialog-content"
          )}
        >
          <DialogHeader>
            <DialogTitle className="text-center">
              {data?.id ? "Edit User" : "Add User"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(
                (data) => {
                  if (!data._id && !data.password) {
                    form.setError("password", {
                      message: "Password is required for new users",
                    });
                    toast.error("Password is required for new users");
                    return;
                  }
                  upsertUser.mutate(data);
                },
                (error) => {
                  toast.error("Failed to update user");
                  console.log(error);
                }
              )}
              className="space-y-4"
            >
              {data?.id && (
                <FormField
                  control={form.control}
                  name="_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ID"
                          disabled
                          {...field}
                          className="bg-background"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Name"
                        {...field}
                        value={field.value ?? ""}
                        className="bg-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Email"
                        type="email"
                        {...field}
                        className="bg-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Password"
                        type="password"
                        {...field}
                        className="bg-background border-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" className="z-[60] max-h-[180px] overflow-y-auto">
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Control">Control</SelectItem>
                        <SelectItem value="IIA">IIA</SelectItem>
                        <SelectItem value="CIA">CIA</SelectItem>
                        <SelectItem value="WBCIA">WBCIA</SelectItem>
                        <SelectItem value="AIA">AIA</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bmuNames"
                render={({ field, fieldState: { error } }) => (
                  <FormItem className="dropdown-container">
                    <div className={cn("flex flex-col gap-y-2")}>
                      <FormLabel>BMUs</FormLabel>
                      <div className="relative" onFocus={() => handleDropdownOpen('bmus')}>
                        <Popover open={bmusOpen} onOpenChange={setBmusOpen}>
                          <PopoverTrigger asChild>
                            <button
                              className="bmu-trigger"
                              onClick={() => {
                                setBmusOpen(!bmusOpen);
                                handleDropdownOpen('bmus');
                              }}
                              type="button"
                            >
                              <span className="text-left truncate">
                                {selectedBmus.length === 0
                                  ? "Select BMUs"
                                  : `${selectedBmus.length} BMU${selectedBmus.length > 1 ? 's' : ''} selected`}
                              </span>
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className={cn(
                                  "transition-transform",
                                  bmusOpen ? "rotate-180" : ""
                                )}
                              >
                                <path
                                  d="M6 9l6 6 6-6"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="bmu-filter-dropdown">
                            <Input
                              placeholder="Search BMUs..."
                              value={bmusSearchFilter}
                              onChange={(e) => setBmusSearchFilter(e.target.value)}
                              className="mb-2"
                            />
                            <SimpleBar className="bmu-filter-content">
                              {filteredBmuGroupsForMultiSelect.map((section, idx) => (
                                <BmusFilterGroup
                                  key={`section-${idx}`}
                                  section={section}
                                  selectedBmus={selectedBmus}
                                  onSelectBmu={handleBmusSelect}
                                  onSelectSection={handleBmusSectionSelect}
                                />
                              ))}
                              {filteredBmuGroupsForMultiSelect.length === 0 && (
                                <div className="py-2 text-center text-gray-500">
                                  No BMUs found
                                </div>
                              )}
                            </SimpleBar>
                          </PopoverContent>
                        </Popover>
                      </div>
                      {error?.message ? (
                        <InputError error={error.message} />
                      ) : null}
                    </div>
                  </FormItem>
                )}
              />

              {/* User BMU Field */}
              <FormField
                control={form.control}
                name="userBmu"
                render={({ field, fieldState: { error } }) => (
                  <FormItem className="dropdown-container">
                    <div className={cn("flex flex-col gap-y-2")}>
                      <FormLabel>User BMU</FormLabel>
                      
                      <Popover 
                        open={bmuOpen} 
                        onOpenChange={setBmuOpen}
                      >
                        <PopoverTrigger asChild>
                          <button
                            className="bmu-trigger"
                            onClick={() => {
                              setBmuOpen(!bmuOpen);
                              handleDropdownOpen('user-bmu');
                            }}
                            type="button"
                          >
                            <span className="text-left truncate">
                              {getSelectedBmuText()}
                            </span>
                            <svg
                              width="24"
                              height="24" 
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className={cn(
                                "transition-transform",
                                bmuOpen ? "rotate-180" : ""
                              )}
                            >
                              <path
                                d="M6 9l6 6 6-6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="bmu-filter-dropdown">
                          <Input
                            placeholder="Search here..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            className="mb-2"
                          />
                          <SimpleBar className="bmu-filter-content">
                            {filteredBmuGroups.map((section, idx) => (
                              <FilterGroup
                                key={`section-${idx}`}
                                section={section}
                                selectedBmu={selectedBmu}
                                onSelectBmu={handleBmuSelect}
                              />
                            ))}
                            {filteredBmuGroups.length === 0 && (
                              <div className="py-2 text-center text-gray-500">
                                No BMUs found
                              </div>
                            )}
                          </SimpleBar>
                        </PopoverContent>
                      </Popover>

                      {error?.message ? (
                        <InputError error={error.message} />
                      ) : null}
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" className="z-[60]">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setModal({
                      open: false,
                      type: "",
                    })
                  }
                  className="w-full"
                >
                  Cancel
                </Button>
                <Button type="submit" className="w-full">
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

const InputError = ({ error }: { error?: string }) => {
  return error ? (
    <div className="!m-0 text-sm text-red-500">{error}</div>
  ) : null;
};
