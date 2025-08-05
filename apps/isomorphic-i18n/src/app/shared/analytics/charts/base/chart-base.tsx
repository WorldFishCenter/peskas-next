import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';

interface BaseChartProps {
  data: any[];
  children: React.ReactNode;
  height?: number;
  allowNegativeValues?: boolean;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  xAxisDataKey?: string;
  yAxisLabel?: string;
  customTooltip?: any;
  customLegend?: any;
  margin?: { top?: number; right?: number; left?: number; bottom?: number };
  className?: string;
}

/**
 * Calculate Y-axis domain with proper handling for negative values
 */
const calculateYDomain = (data: any[], allowNegativeValues: boolean): any => {
  if (!allowNegativeValues) {
    return [0, 'dataMax'];
  }

  // For negative values, calculate dynamic domain with padding
  return (dataMin: number, dataMax: number) => {
    const min = dataMin < 0 ? dataMin * 1.1 : 0;
    const max = dataMax > 0 ? dataMax * 1.1 : 0;
    return [min, max];
  };
};

/**
 * Format date for X-axis display
 */
const formatDate = (timestamp: number | string) => {
  const date = new Date(timestamp);
  return format(date, 'MMM yyyy');
};

/**
 * Base Bar Chart Component
 */
export const BaseBarChart: React.FC<BaseChartProps> = ({
  data,
  children,
  height = 400,
  allowNegativeValues = false,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  xAxisDataKey = 'date',
  yAxisLabel,
  customTooltip,
  customLegend,
  margin = { top: 10, right: 30, left: 10, bottom: 0 },
  className = '',
}) => {
  const yDomain = calculateYDomain(data, allowNegativeValues);

  return (
    <div className={`h-96 w-full pt-9 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={margin} barCategoryGap="30%" barSize={20}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
              strokeOpacity={0.7}
            />
          )}
          
          {showXAxis && (
            <XAxis
              dataKey={xAxisDataKey}
              tickFormatter={xAxisDataKey === 'date' ? formatDate : undefined}
              axisLine={false}
              tick={{ fontSize: 12 }}
              minTickGap={15}
              padding={{ left: 20, right: 20 }}
              interval="preserveStartEnd"
            />
          )}
          
          {showYAxis && (
            <YAxis
              tickFormatter={(value) => value.toFixed(1)}
              axisLine={false}
              tick={{ fontSize: 12 }}
              width={80}
              domain={yDomain}
              label={yAxisLabel ? {
                value: yAxisLabel,
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: 12, fill: '#666' }
              } : undefined}
            />
          )}
          
          {customTooltip && <Tooltip content={customTooltip} wrapperStyle={{ outline: 'none' }} />}
          
          {/* Zero reference line for negative values */}
          {allowNegativeValues && <ReferenceLine y={0} stroke="#000" strokeWidth={1} />}
          
          {children}
          
          {customLegend && <Legend content={customLegend} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Base Line Chart Component
 */
export const BaseLineChart: React.FC<BaseChartProps> = ({
  data,
  children,
  height = 400,
  allowNegativeValues = false,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  xAxisDataKey = 'date',
  yAxisLabel,
  customTooltip,
  customLegend,
  margin = { top: 10, right: 30, left: 10, bottom: 0 },
  className = '',
}) => {
  const yDomain = calculateYDomain(data, allowNegativeValues);

  return (
    <div className={`h-96 w-full pt-9 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={margin}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              strokeOpacity={0.7}
            />
          )}
          
          {showXAxis && (
            <XAxis
              dataKey={xAxisDataKey}
              tickFormatter={xAxisDataKey === 'date' ? formatDate : undefined}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
          )}
          
          {showYAxis && (
            <YAxis
              tickFormatter={(value) => value.toFixed(1)}
              axisLine={false}
              tick={{ fontSize: 12 }}
              domain={yDomain}
              label={yAxisLabel ? {
                value: yAxisLabel,
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: 12, fill: '#666' }
              } : undefined}
            />
          )}
          
          {customTooltip && <Tooltip content={customTooltip} wrapperStyle={{ outline: 'none' }} />}
          
          {/* Zero reference line for negative values */}
          {allowNegativeValues && <ReferenceLine y={0} stroke="#000" strokeWidth={1} />}
          
          {children}
          
          {customLegend && <Legend content={customLegend} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Base Area Chart Component
 */
export const BaseAreaChart: React.FC<BaseChartProps> = ({
  data,
  children,
  height = 400,
  allowNegativeValues = false,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  xAxisDataKey = 'date',
  yAxisLabel,
  customTooltip,
  customLegend,
  margin = { top: 10, right: 30, left: 10, bottom: 0 },
  className = '',
}) => {
  const yDomain = calculateYDomain(data, allowNegativeValues);

  return (
    <div className={`h-96 w-full pt-9 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={margin}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              strokeOpacity={0.7}
            />
          )}
          
          {showXAxis && (
            <XAxis
              dataKey={xAxisDataKey}
              tickFormatter={xAxisDataKey === 'date' ? formatDate : undefined}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
          )}
          
          {showYAxis && (
            <YAxis
              tickFormatter={(value) => value.toFixed(1)}
              axisLine={false}
              tick={{ fontSize: 12 }}
              domain={yDomain}
              label={yAxisLabel ? {
                value: yAxisLabel,
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: 12, fill: '#666' }
              } : undefined}
            />
          )}
          
          {customTooltip && <Tooltip content={customTooltip} wrapperStyle={{ outline: 'none' }} />}
          
          {/* Zero reference line for negative values */}
          {allowNegativeValues && <ReferenceLine y={0} stroke="#000" strokeWidth={1} />}
          
          {children}
          
          {customLegend && <Legend content={customLegend} />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Chart Error Boundary Component
 */
interface ChartErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ChartErrorBoundary extends React.Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="h-96 w-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 mb-2">Chart failed to load</p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Try again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Loading component for charts
 */
export const ChartLoader: React.FC<{ height?: number; className?: string }> = ({ 
  height = 400, 
  className = '' 
}) => (
  <div className={`h-96 w-full flex items-center justify-center ${className}`}>
    <div className="flex flex-col items-center gap-2">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
      <span className="text-sm text-gray-500">Loading chart...</span>
    </div>
  </div>
);