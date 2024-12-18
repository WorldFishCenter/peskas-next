import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAtom } from 'jotai';
import { ActionIcon, Popover } from "rizzui";
import WidgetCard from '@components/cards/widget-card';
import SimpleBar from '@ui/simplebar';
import { useTranslation } from '@/app/i18n/client';
import { api } from "@/trpc/react";
import { bmusAtom } from "@/app/components/filter-selector";
import cn from "@utils/class-names";

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type MetricKey = "mean_trip_catch" | "mean_effort" | "mean_cpue" | "mean_cpua";

interface MetricOption {
  value: MetricKey;
  label: string;
  unit: string;
}

const METRIC_OPTIONS: MetricOption[] = [
  { value: "mean_trip_catch", label: "Mean Catch per Trip", unit: "kg" },
  { value: "mean_effort", label: "Mean Effort", unit: "hours" },
  { value: "mean_cpue", label: "Mean CPUE", unit: "kg/hour" },
  { value: "mean_cpua", label: "Mean CPUA", unit: "kg/area" }
];

const NO_DATA_COLOR = '#f0f0f0';
const YL_GN_BU = [
  '#ffffd9', // Lightest
  '#edf8b1',
  '#c7e9b4',
  '#7fcdbb',
  '#41b6c4',
  '#1d91c0',
  '#225ea8'  // Darkest
];

const FIXED_RANGES = {
  mean_effort: [
    { from: 0, to: 0.5, color: YL_GN_BU[0] },
    { from: 0.5, to: 0.8, color: YL_GN_BU[1] },
    { from: 0.8, to: 1.2, color: YL_GN_BU[2] },
    { from: 1.2, to: 3.9, color: YL_GN_BU[3] },
    { from: 3.9, to: 6.6, color: YL_GN_BU[4] },
    { from: 6.6, to: Number.MAX_VALUE, color: YL_GN_BU[5] }
  ],
  mean_trip_catch: [
    { from: 0, to: 5, color: YL_GN_BU[0] },
    { from: 5, to: 10, color: YL_GN_BU[1] },
    { from: 10, to: 15, color: YL_GN_BU[2] },
    { from: 15, to: 20, color: YL_GN_BU[3] },
    { from: 20, to: 25, color: YL_GN_BU[4] },
    { from: 25, to: Number.MAX_VALUE, color: YL_GN_BU[5] }
  ],
  mean_cpue: [
    { from: 0, to: 2, color: YL_GN_BU[0] },
    { from: 2, to: 4, color: YL_GN_BU[1] },
    { from: 4, to: 6, color: YL_GN_BU[2] },
    { from: 6, to: 8, color: YL_GN_BU[3] },
    { from: 8, to: 10, color: YL_GN_BU[4] },
    { from: 10, to: Number.MAX_VALUE, color: YL_GN_BU[5] }
  ],
  mean_cpua: [
    { from: 0, to: 2, color: YL_GN_BU[0] },
    { from: 2, to: 4, color: YL_GN_BU[1] },
    { from: 4, to: 6, color: YL_GN_BU[2] },
    { from: 6, to: 8, color: YL_GN_BU[3] },
    { from: 8, to: 10, color: YL_GN_BU[4] },
    { from: 10, to: Number.MAX_VALUE, color: YL_GN_BU[5] }
  ]
};

const MetricSelector = ({
  selectedMetric,
  onMetricChange,
  selectedMetricOption,
}: {
  selectedMetric: MetricKey;
  onMetricChange: (metric: MetricKey) => void;
  selectedMetricOption: MetricOption | undefined;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Select metric:</span>
      <Popover isOpen={isOpen} setIsOpen={setIsOpen} placement="bottom-end">
        <Popover.Trigger>
          <ActionIcon
            variant="text"
            className="relative h-auto w-auto p-0 flex items-center gap-2"
          >
            <span className="text-sm font-medium text-gray-900">
              {selectedMetricOption?.label}
            </span>
            <svg
              className="h-4 w-4 text-gray-500"
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
        </Popover.Trigger>
        <Popover.Content className="w-[200px] p-1">
          <div className="space-y-0.5">
            {METRIC_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onMetricChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm transition duration-200 rounded-md",
                  selectedMetric === option.value
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover>
    </div>
  );
};

interface GearData {
  BMU: string;
  gear: string;
  [key: string]: any;
}

export default function GearHeatmap({ className, lang }: { className?: string; lang?: string; }) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("mean_cpue");
  const [series, setSeries] = useState<any[]>([]);
  const [colorRanges, setColorRanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation(lang!, 'common');
  const [bmus] = useAtom(bmusAtom);

  const { data: rawData } = api.gear.summaries.useQuery({ bmus });
  const selectedMetricOption = METRIC_OPTIONS.find(m => m.value === selectedMetric);

  useEffect(() => {
    if (!rawData) return;

    try {
      setLoading(true);

      const ranges = FIXED_RANGES[selectedMetric];
      const formattedRanges = ranges.map((range, index) => ({
        ...range,
        name: index === 0 ? `< ${range.to}` :
              index === ranges.length - 1 ? `> ${range.from}` :
              `${range.from} - ${range.to}`
      }));

      setColorRanges([
        { from: -1, to: -1, color: NO_DATA_COLOR, name: 'No Data' },
        ...formattedRanges
      ]);

      const bmuList = Array.from(new Set(rawData.map((d: GearData) => d.BMU))).sort();
      const gearTypes = Array.from(new Set(rawData.map((d: GearData) => d.gear)))
        .sort((a, b) => {
          const aValue = rawData.reduce((sum, curr) => 
            sum + (curr.gear === a && typeof curr[selectedMetric] === 'number' ? curr[selectedMetric] : 0), 0);
          const bValue = rawData.reduce((sum, curr) => 
            sum + (curr.gear === b && typeof curr[selectedMetric] === 'number' ? curr[selectedMetric] : 0), 0);
          return bValue - aValue;
        });

      const transformedSeries = bmuList.map(bmu => ({
        name: bmu,
        data: gearTypes.map(gear => {
          const match = rawData.find(d => d.BMU === bmu && d.gear === gear);
          const value = match && typeof match[selectedMetric] === 'number' ? match[selectedMetric] : -1;
          return value > 0 ? Number(value.toFixed(2)) : -1;
        })
      }));

      setSeries(transformedSeries);
      setError(null);
    } catch (error) {
      console.error('Error transforming data:', error);
      setError('Error processing data');
    } finally {
      setLoading(false);
    }
  }, [rawData, selectedMetric]);

  const chartOptions = {
    chart: {
      type: 'heatmap' as const,
      toolbar: {
        show: false
      },
      fontFamily: 'Inter, sans-serif',
    },
    dataLabels: {
      enabled: true,
      style: {
        colors: ['#fff'],
        fontSize: '14px',
        fontWeight: '600'
      },
      formatter: function(val: string | number | number[], opts?: any) {
        if (typeof val === 'number' && val !== -1) {
          return val.toFixed(1);
        }
        return '';
      }
    },
    plotOptions: {
      heatmap: {
        enableShades: false,
        colorScale: {
          ranges: colorRanges
        }
      }
    },
    xaxis: {
      categories: Array.from(new Set(rawData?.map((d: GearData) => d.gear.replace(/_/g, ' ')))),
      labels: {
        trim: true,
        style: {
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          fontSize: '12px'
        }
      }
    },
    legend: {
      show: true,
      position: 'top' as const,
      fontSize: '12px',
      markers: {
        size: 10
      },
      formatter: function(seriesName: string, opts?: any) {
        if (!opts) return seriesName;
        const range = colorRanges[opts.seriesIndex];
        if (!range) return '';
        return range.name;
      }
    },
    tooltip: {
      custom: function({ series, seriesIndex, dataPointIndex, w }: any) {
        const value = series[seriesIndex][dataPointIndex];
        const bmu = w.globals.seriesNames[seriesIndex];
        const gearType = w.globals.labels[dataPointIndex];

        if (value === -1) {
          return `
            <div class="p-2 bg-white rounded-lg shadow-lg border border-gray-200">
              <div class="text-sm font-medium text-gray-600">BMU: ${bmu}</div>
              <div class="text-sm">Gear Type: ${gearType}</div>
              <div class="text-sm font-medium mt-1">No Data</div>
            </div>
          `;
        }

        return `
          <div class="p-2 bg-white rounded-lg shadow-lg border border-gray-200">
            <div class="text-sm font-medium text-gray-600">BMU: ${bmu}</div>
            <div class="text-sm">Gear Type: ${gearType}</div>
            <div class="text-sm font-medium mt-1">${selectedMetricOption?.label}: ${value.toFixed(2)} ${selectedMetricOption?.unit}</div>
          </div>
        `;
      }
    }
  };

  if (loading) return <div className="p-4">Loading chart...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!series || series.length === 0) return <div className="p-4">No gear data available</div>;

  return (
    <WidgetCard
      title={
        <div className="flex items-center justify-between w-full">
          <MetricSelector
            selectedMetric={selectedMetric}
            onMetricChange={setSelectedMetric}
            selectedMetricOption={selectedMetricOption}
          />
        </div>
      }
      className={className}
    >
      <SimpleBar>
        <div className="h-[600px] w-full pt-9">
          <Chart
            options={chartOptions}
            series={series}
            type="heatmap"
            height="100%"
          />
        </div>
      </SimpleBar>
    </WidgetCard>
  );
}