import { useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { ActionIcon, Popover } from "rizzui";
import cn from "@utils/class-names";
import { MetricKey, MetricOption, METRIC_OPTIONS } from "./types";

interface MetricSelectorProps {
  selectedMetric: MetricKey;
  onMetricChange: (metric: MetricKey) => void;
  selectedMetricOption: MetricOption | undefined;
}

export default function MetricSelector({
  selectedMetric,
  onMetricChange,
  selectedMetricOption,
}: MetricSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation("common");

  const groupedMetrics = {
    catch: METRIC_OPTIONS.filter((m) => m.category === "catch"),
    revenue: METRIC_OPTIONS.filter((m) => m.category === "revenue"),
  };

  // Helper function to get the unit translation key
  const getUnitTranslationKey = (unit: string) => {
    switch (unit) {
      case 'fishers/km²/day':
        return 'text-unit-fishers-km2-day';
      case 'kg/fisher/day':
        return 'text-unit-kg-fisher-day';
      case 'kg/km²/day':
        return 'text-unit-kg-km2-day';
      case 'KES/fisher/day':
        return 'text-unit-kes-fisher-day';
      case 'KES/km²/day':
        return 'text-unit-kes-km2-day';
      default:
        return '';
    }
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
                selectedMetric === "mean_rpue" || selectedMetric === "mean_rpua"
                  ? "bg-amber-50 text-amber-900"
                  : "bg-blue-50 text-blue-900"
              )}
            >
              <div className="flex flex-col items-start">
                <span className="text-base sm:text-sm font-medium">
                  {t(`text-metrics-${selectedMetricOption?.label.toLowerCase().replace(/ /g, "-")}`)}
                </span>
                {selectedMetricOption?.unit && (
                  <span className="text-xs text-gray-500 font-normal mt-0.5">
                    ({selectedMetricOption.unit && t(getUnitTranslationKey(selectedMetricOption.unit))})
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
              {/* Catch Metrics Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-base sm:text-sm font-semibold text-gray-900">
                    {t("text-metrics-catch")}
                  </span>
                </div>
                <div className="space-y-2 pl-4">
                  {groupedMetrics.catch.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onMetricChange(option.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2.5 sm:py-2 text-left text-base sm:text-sm transition duration-200 rounded-md flex items-center justify-between",
                        selectedMetric === option.value
                          ? "bg-blue-50/90 text-blue-900"
                          : "text-gray-600 hover:bg-gray-50/90"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{t(`text-metrics-${option.label.toLowerCase().replace(/ /g, "-")}`)}</span>
                        <span className="text-xs text-gray-500 mt-0.5">
                          {option.unit && t(getUnitTranslationKey(option.unit))}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 my-3" />

              {/* Revenue Metrics Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-base sm:text-sm font-semibold text-gray-900">
                    {t("text-metrics-revenue")}
                  </span>
                </div>
                <div className="space-y-2 pl-4">
                  {groupedMetrics.revenue.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onMetricChange(option.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full px-4 py-2.5 sm:py-2 text-left text-base sm:text-sm transition duration-200 rounded-md flex items-center justify-between",
                        selectedMetric === option.value
                          ? "bg-amber-50 text-amber-900"
                          : "text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{t(`text-metrics-${option.label.toLowerCase().replace(/ /g, "-")}`)}</span>
                        <span className="text-xs text-gray-500 mt-0.5">
                          {option.unit && t(getUnitTranslationKey(option.unit))}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Popover.Content>
        </Popover>
      </div>
    </div>
  );
} 