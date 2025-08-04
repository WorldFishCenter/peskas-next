import React from "react";

export type GearPerformanceCardProps = {
  gear: {
    name: string;
    yourValue: number;
    bmuAverage: number;
    difference?: number;
    trips?: number;
  };
  selectedMetric: string;
  t: (key: string) => string;
  bmuName?: string | null;
};

const GearPerformanceCard: React.FC<GearPerformanceCardProps> = ({ gear, selectedMetric, t, bmuName }) => {
  const percentDiff = gear.bmuAverage > 0 
    ? ((gear.yourValue - gear.bmuAverage) / gear.bmuAverage * 100)
    : 0;
  const isPerformingBetter = selectedMetric === 'fisher_cost' 
    ? percentDiff < 0 
    : percentDiff > 0;
  const gearTrips = gear.trips || 0;
  // Bar colors
  const yourBarColor = '#F79F79';
  const othersBarColor = '#8693AB';
  // Bar widths
  const maxValue = Math.max(gear.yourValue, gear.bmuAverage, 1);
  const yourWidth = (gear.yourValue / maxValue) * 100;
  const othersWidth = (gear.bmuAverage / maxValue) * 100;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-lg uppercase">
          {gear.name[0]}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">{gear.name}</h3>
          <p className="text-xs text-gray-500">{gearTrips} {t('text-trips')}</p>
        </div>
      </div>
      {/* Your Performance */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">{t('text-you')}</span>
          <span className="text-sm font-bold text-gray-900">
            {selectedMetric === "fisher_cpue" 
              ? `${gear.yourValue.toFixed(2)} kg/trip`
              : `KES ${gear.yourValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
            }
          </span>
        </div>
      </div>
      {/* Others Average */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">{`${t('text-others-in-bmu')}${bmuName ? ' ' + bmuName : ''}`}</span>
          <span className="text-sm text-gray-600">
            {selectedMetric === "fisher_cpue" 
              ? `${gear.bmuAverage.toFixed(2)} kg/trip`
              : `KES ${gear.bmuAverage.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
            }
          </span>
        </div>
      </div>
      {/* Visual Comparison Bar */}
      <div className="mb-3 space-y-2">
        {/* Your bar */}
        <div className="relative">
          <div className="h-6 bg-gray-200 rounded-md overflow-hidden">
            <div 
              className={"h-full rounded-md transition-all duration-500"}
              style={{ width: `${yourWidth}%`, backgroundColor: yourBarColor }}
            />
          </div>
          <span className="absolute left-2 top-0 h-6 flex items-center text-xs font-medium text-white">
            {t('text-you')}
          </span>
        </div>
        {/* Others bar */}
        <div className="relative">
          <div className="h-6 bg-gray-200 rounded-md overflow-hidden">
            <div className="h-full rounded-md transition-all duration-500"
              style={{ width: `${othersWidth}%`, backgroundColor: othersBarColor }}
            />
          </div>
          <span className="absolute left-2 top-0 h-6 flex items-center text-xs font-medium text-white">
            {t('text-others')}
          </span>
        </div>
      </div>
      {/* Comparison Result */}
      <div className={`p-3 rounded-lg text-center ${isPerformingBetter ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className={`text-lg font-bold ${isPerformingBetter ? 'text-green-700' : 'text-red-700'}`}>
          {isPerformingBetter ? '👍' : '👎'} {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
        </div>
        <p className={`text-xs font-medium ${isPerformingBetter ? 'text-green-600' : 'text-red-600'}`}>
          {isPerformingBetter 
            ? (selectedMetric === 'fisher_cost' ? t('text-you-spend-less') : t('text-you-perform-better'))
            : (selectedMetric === 'fisher_cost' ? t('text-you-spend-more') : t('text-you-perform-lower'))
          }
        </p>
      </div>
    </div>
  );
};

export default GearPerformanceCard; 