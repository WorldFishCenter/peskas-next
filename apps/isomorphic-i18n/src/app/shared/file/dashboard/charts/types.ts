import { Session } from "next-auth";

export type MetricKey = "mean_effort" | "mean_cpue" | "mean_cpua" | "mean_rpue" | "mean_rpua";

export interface ChartDataPoint {
  date: number;
  average?: number;
  [key: string]: number | undefined;
}

export interface ApiDataPoint {
  date: string;
  landing_site: string;
  mean_effort: number;
  mean_cpue: number;
  mean_cpua: number;
  mean_rpue: number;
  mean_rpua: number;
}

export interface MetricOption {
  value: MetricKey;
  label: string;
  unit: string;
  category: "catch" | "revenue";
}

export interface VisibilityState {
  [key: string]: {
    opacity: number;
  };
}

export interface ChartProps {
  className?: string;
  chartData: ChartDataPoint[];
  selectedMetric: MetricKey;
  selectedMetricOption: MetricOption | undefined;
  bmu?: string;
  siteColors: Record<string, string>;
  visibilityState: VisibilityState;
  isCiaUser: boolean;
  isTablet: boolean;
  handleLegendClick: (site: string) => void;
}

export type TickProps = {
  x?: number;
  y?: number;
  payload?: {
    value: number;
  };
};

export const METRIC_OPTIONS: MetricOption[] = [
  {
    value: "mean_effort",
    label: "Effort",
    unit: "fishers/km²/day",
    category: "catch",
  },
  {
    value: "mean_cpue",
    label: "Catch Rate",
    unit: "kg/fisher/day",
    category: "catch",
  },
  {
    value: "mean_cpua",
    label: "Catch Density",
    unit: "kg/km²/day",
    category: "catch",
  },
  {
    value: "mean_rpue",
    label: "Fisher Revenue",
    unit: "KES/fisher/day",
    category: "revenue",
  },
  {
    value: "mean_rpua",
    label: "Area Revenue",
    unit: "KES/km²/day",
    category: "revenue",
  },
];

export const isCiaUser = (session?: Session | null): boolean => {
  if (!session?.user?.groups) return false;
  return session.user.groups.some((group: any) => group.name === 'CIA');
}; 