import { useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { ActionIcon, Popover } from "rizzui";
import cn from "@utils/class-names";
import { FishCategoryKey, FishCategoryOption } from "../fish-composition-chart";
import { generateFishCategoryColor } from "./utils";

interface FishCategorySelectorProps {
  selectedCategory: FishCategoryKey;
  onCategoryChange: (category: FishCategoryKey) => void;
  selectedCategoryOption: FishCategoryOption | undefined;
  fishCategories: FishCategoryOption[];
}

export default function FishCategorySelector({
  selectedCategory,
  onCategoryChange,
  selectedCategoryOption,
  fishCategories,
}: FishCategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation("common");

  // Simplified category grouping - just create a single flat list
  const allCategories = [...fishCategories].sort((a, b) => {
    // Put "Rest Of Catch" and "Scavengers" at the end
    if (["Rest Of Catch", "Scavengers"].includes(a.value) && !["Rest Of Catch", "Scavengers"].includes(b.value)) {
      return 1;
    }
    if (!["Rest Of Catch", "Scavengers"].includes(a.value) && ["Rest Of Catch", "Scavengers"].includes(b.value)) {
      return -1;
    }
    return a.label.localeCompare(b.label);
  });

  return (
    <div className="w-full">
      <Popover isOpen={isOpen} setIsOpen={setIsOpen} placement="bottom-start">
        <Popover.Trigger>
          <ActionIcon
            variant="text"
            className={cn(
              "relative w-full sm:w-auto px-3 py-1.5 rounded-md sm:rounded-full flex items-center justify-between",
              "bg-teal-50 text-teal-900 border border-teal-100 hover:bg-teal-100 transition-colors"
            )}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: selectedCategoryOption ? generateFishCategoryColor(selectedCategoryOption.label) : "#14b8a6" }}
              />
              <span className="text-sm font-medium truncate">
                {selectedCategoryOption?.label || t("text-fish-category")}
              </span>
              <svg
                className="h-4 w-4 flex-shrink-0 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </ActionIcon>
        </Popover.Trigger>
        <Popover.Content
          className="w-56 p-1.5 bg-white shadow-lg rounded-lg border border-gray-100"
        >
          <div className="max-h-60 overflow-y-auto">
            {allCategories.map((option) => {
              // Add console log to verify the actual category label and color
              console.log(`Fish selector: "${option.label}" → color: ${generateFishCategoryColor(option.label)}`);
              
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onCategoryChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-sm transition-colors rounded-md flex items-center",
                    selectedCategory === option.value
                      ? "bg-teal-50 text-teal-900"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <div 
                    className="mr-2 w-2 h-2 rounded-full flex-shrink-0"
                    style={{ 
                      backgroundColor: generateFishCategoryColor(option.label)
                    }}
                  />
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover>
    </div>
  );
} 