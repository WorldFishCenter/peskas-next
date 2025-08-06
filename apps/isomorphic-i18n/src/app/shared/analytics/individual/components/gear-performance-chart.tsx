import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import cn from "@utils/class-names";

export type GearPerformanceBarChartProps = {
  data: Array<{
    name: string;
    yourValue: number;
    bmuAverage: number;
    difference?: number;
    trips?: number;
  }>;
  selectedMetric: string;
  setSelectedMetric: (metric: string) => void;
  t: (key: string) => string;
  METRIC_OPTIONS: Array<{ key: string; label: string; color: string; unit: string }>;
  bmuName?: string | null;
  canCompareWithOthers?: boolean;
};

const GearPerformanceBarChart: React.FC<GearPerformanceBarChartProps> = ({
  data,
  selectedMetric,
  setSelectedMetric,
  t,
  METRIC_OPTIONS,
  bmuName,
  canCompareWithOthers = true,
}) => {
  // Sort data: descending for most metrics, ascending for 'fisher_cost'
  const sortedData = React.useMemo(() => {
    if (selectedMetric === 'fisher_cost') {
      return [...data].sort((a, b) => a.yourValue - b.yourValue);
    }
    return [...data].sort((a, b) => b.yourValue - a.yourValue);
  }, [data, selectedMetric]);
  return (
    <>
      {/* Metric selector buttons - hidden for all users since they use global header selector */}
      {false && (
        <div className="flex w-full gap-2 mb-4 overflow-x-auto">
          {METRIC_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => setSelectedMetric(option.key)}
              className={cn(
                "px-4 py-2 font-semibold rounded-md transition duration-200 w-full sm:w-auto",
                selectedMetric === option.key
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {t(option.label)}
            </button>
          ))}
        </div>
      )}
      <div className="h-96 w-full pt-9">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            barGap={2}
            barCategoryGap={10}
          >
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 11 }}
              axisLine={false}
              width={80}
            />
            <XAxis
              type="number"
              axisLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={(value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 1 })}
              label={{
                value: METRIC_OPTIONS.find(opt => opt.key === selectedMetric)?.unit || '',
                position: 'insideBottom',
                offset: -5,
                fontSize: 12,
                fill: '#64748b',
              }}
            />
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <Tooltip 
              content={({ active, payload, label }: any) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const percentDiff = data.bmuAverage > 0 
                    ? ((data.yourValue - data.bmuAverage) / data.bmuAverage * 100).toFixed(1)
                    : null;
                  const metricLabel = METRIC_OPTIONS.find((opt) => opt.key === selectedMetric)?.label;
                  const formatValue = (val: number) => {
                    if (selectedMetric === "fisher_cpue") return `${val.toFixed(2)} kg/trip`;
                    return `KES ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/trip`;
                  };
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F79F79' }} />
                          <span className="text-sm font-medium">
                            {t('text-your')} {t(metricLabel!)} <span className="font-semibold">{formatValue(data.yourValue)}</span>
                          </span>
                        </div>
                        {canCompareWithOthers && (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8693AB' }} />
                              <span className="text-sm font-medium">
                                {bmuName ? `${bmuName} ` : ''}{t('text-average')} <span className="font-semibold">{formatValue(data.bmuAverage)}</span>
                              </span>
                            </div>
                            {percentDiff !== null && (
                              <span className={cn(
                                "text-sm font-semibold",
                                data.difference > 0 ? "text-green-600" : "text-red-600"
                              )}>
                                {data.difference > 0 ? '+' : ''}{percentDiff}%
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="yourValue"
              name={t('text-your-performance')}
              fill="#F79F79"
              radius={[4, 4, 4, 4]}
              barSize={18}
            />
            {canCompareWithOthers && (
              <Bar
                dataKey="bmuAverage"
                name={`${bmuName ? bmuName + ' ' : ''}${t('text-average')}`}
                fill="#8693AB"
                radius={[4, 4, 4, 4]}
                barSize={18}
              />
            )}
            {canCompareWithOthers && (
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="rect"
                wrapperStyle={{ paddingTop: '10px' }}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

export default GearPerformanceBarChart; 