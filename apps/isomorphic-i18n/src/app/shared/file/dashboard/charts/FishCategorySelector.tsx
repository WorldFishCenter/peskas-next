import { useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { ActionIcon, Popover } from "rizzui";
import cn from "@utils/class-names";
import { FishCategoryKey, FishCategoryOption } from "../fish-composition-chart";

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

  // Group fish categories into types
  const groupedCategories = {
    main: fishCategories.filter((c) => !["Rest Of Catch", "Scavengers"].includes(c.value)),
    other: fishCategories.filter((c) => ["Rest Of Catch", "Scavengers"].includes(c.value)),
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center w-full">
        <Popover isOpen={isOpen} setIsOpen={setIsOpen} placement="bottom-start">
          <Popover.Trigger>
            <ActionIcon
              variant="text"
              className={cn(
                "relative w-full sm:min-w-[200px] h-auto px-5 py-2.5 sm:py-2 rounded-md sm:rounded-full flex items-center justify-between",
                "bg-teal-50 text-teal-900"
              )}
            >
              <div className="flex flex-col items-start">
                <span className="text-base sm:text-sm font-medium">
                  {selectedCategoryOption?.label || t("text-fish-category")}
                </span>
                {selectedCategoryOption?.unit && (
                  <span className="text-xs text-gray-500 font-normal mt-0.5">
                    ({t("text-unit-kg")})
                  </span>
                )}
              </div>
              <svg
                className="h-5 w-5 sm:h-4 sm:w-4 ml-2 flex-shrink-0"
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
            </ActionIcon>
          </Popover.Trigger>{" "}
          <Popover.Content
            className="w-full max-w-[300px] p-3 bg-white/75 backdrop-blur-sm"
          >
            <div className="grid grid-cols-1 gap-2">
              {/* Main Fish Categories Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-3 h-3 rounded-full bg-teal-500" />
                  <span className="text-base sm:text-sm font-semibold text-gray-900">
                    {t("text-fish-main-categories")}
                  </span>
                </div>
                <div className="space-y-2 pl-4">
                  {groupedCategories.main.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onCategoryChange(option.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2.5 sm:py-2 text-left text-base sm:text-sm transition duration-200 rounded-md flex items-center justify-between",
                        selectedCategory === option.value
                          ? "bg-teal-50/90 text-teal-900"
                          : "text-gray-600 hover:bg-gray-50/90"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-gray-500 mt-0.5">
                          {t("text-unit-kg")}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {groupedCategories.other.length > 0 && (
                <>
                  <div className="border-t border-gray-200 my-3" />

                  {/* Other Categories Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-2">
                      <div className="w-3 h-3 rounded-full bg-gray-500" />
                      <span className="text-base sm:text-sm font-semibold text-gray-900">
                        {t("text-other-categories")}
                      </span>
                    </div>
                    <div className="space-y-2 pl-4">
                      {groupedCategories.other.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            onCategoryChange(option.value);
                            setIsOpen(false);
                          }}
                          className={cn(
                            "w-full px-4 py-2.5 sm:py-2 text-left text-base sm:text-sm transition duration-200 rounded-md flex items-center justify-between",
                            selectedCategory === option.value
                              ? "bg-gray-50 text-gray-900"
                              : "text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-xs text-gray-500 mt-0.5">
                              {t("text-unit-kg")}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Popover.Content>
        </Popover>
      </div>
    </div>
  );
} 