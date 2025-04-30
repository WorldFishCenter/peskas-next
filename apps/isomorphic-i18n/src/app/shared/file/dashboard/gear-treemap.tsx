import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { ActionIcon, Popover } from "rizzui";
import WidgetCard from "@components/cards/widget-card";
import SimpleBar from "@ui/simplebar";
import { useTranslation } from "@/app/i18n/client";
import { api } from "@/trpc/react";
import { bmusAtom } from "@/app/components/filter-selector";
import cn from "@utils/class-names";
import { useTheme } from "next-themes";
import MetricCard from "@components/cards/metric-card";
import { useSession } from "next-auth/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
  Treemap,
} from "recharts";

// Import shared MetricSelector component
import MetricSelector from "./charts/MetricSelector";
import { MetricKey, MetricOption } from "./charts/types";
// Import shared permissions hook
import useUserPermissions from "./hooks/useUserPermissions";

// Define METRIC_OPTIONS if not imported from types
const METRIC_OPTIONS: MetricOption[] = [
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

// Consistent color palette with other charts
const generateColor = (index: number, site: string, referenceBmu: string | undefined): string => {
  if (site === referenceBmu) {
    return "#fc3468"; // Red color for reference BMU
  }
  const colors = [
    "#0c526e", // Dark blue
    "#f09609", // Orange
    "#2563eb", // Blue
    "#16a34a", // Green
    "#9333ea", // Purple
    "#ea580c", // Dark orange
    "#0891b2", // Teal
  ];
  return colors[index % colors.length];
};

// Colors for gear types (consistent set)
const GEAR_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
];

const formatNumber = (value: number) => {
  if (value >= 1000) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(value);
  }
  return value.toFixed(1);
};

const capitalizeGearType = (gear: string) => {
  return gear
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

interface GearData {
  BMU: string;
  gear: string;
  [key: string]: any;
}

interface VisibilityState {
  [key: string]: { opacity: number };
}

interface RankingDataItem {
  name: string;
  value: number;
  fill: string;
  percentage?: string;
}

const LoadingState = () => {
  const { t } = useTranslation("common");
  return (
    <MetricCard
      title=""
      metric=""
      rounded="lg"
      chart={
        <div className="h-24 w-24 @[16.25rem]:h-28 @[16.25rem]:w-32 @xs:h-32 @xs:w-36 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-500">{t("text-loading")}</span>
          </div>
        </div>
      }
      chartClassName="flex flex-col w-auto h-auto text-center justify-center"
      className="min-w-[292px] w-full max-w-full flex flex-col items-center justify-center"
    />
  );
};

// Custom tooltip consistent with other charts
const CustomTooltip = ({ active, payload, label, selectedMetricOption }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload
            .filter((p: any) => p.value !== undefined && p.value !== null)
            .sort((a: any, b: any) => b.value - a.value)
            .map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <p className="text-sm">
                  <span className="font-medium">{entry.name}:</span>{" "}
                  <span className="font-semibold">{formatNumber(entry.value)}</span>
                </p>
              </div>
            ))}
        </div>
      </div>
    );
  }
  return null;
};

// Custom legend component consistent with other charts
const CustomLegend = ({ payload, visibilityState, handleLegendClick }: any) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-2">
      {payload?.map((entry: any) => {
        const key = entry.dataKey || entry.value;
        const opacity = visibilityState[key]?.opacity ?? 1;
        
        return (
          <div
            key={key}
            className="flex items-center gap-2 cursor-pointer select-none transition-all duration-200"
            onClick={() => handleLegendClick(key)}
            style={{ opacity }}
          >
            <div
              className="w-3 h-3 rounded-full transition-all duration-200"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium">{entry.value}</span>
          </div>
        );
      })}
    </div>
  );
};

// Custom treemap tooltip for ranking view
const TreemapTooltip = ({ active, payload, selectedMetricOption }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-600 mb-2">{data.name}</p>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.fill }}
          />
          <p className="text-sm">
            <span className="font-semibold">{formatNumber(data.value)}</span>
            {data.percentage && (
              <span className="text-gray-500 ml-1">({data.percentage}%)</span>
            )}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// Custom treemap content component to handle visibility state and labels
const CustomizedTreemapContent = (props: any) => {
  const { depth, x, y, width, height, index, name, fill, root, opacity, visibilityState } = props;
  
  // Handle visibility state
  const itemOpacity = visibilityState && name ? (visibilityState[name]?.opacity || 1) * 0.85 : 0.85;
  
  // Only show text if the rectangle is big enough
  const showLabel = width > 30 && height > 30;
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        fillOpacity={itemOpacity}
        stroke="#fff"
        strokeWidth={2}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fill="#fff"
          fontWeight={500}
        >
          {name}
        </text>
      )}
    </g>
  );
};

export default function GearHeatmap({
  className,
  lang,
  bmu,
}: {
  className?: string;
  lang?: string;
  bmu?: string;
}) {
  const { theme } = useTheme();
  const [selectedMetric, setSelectedMetric] =
    useState<MetricKey>("mean_effort");
  const [barData, setBarData] = useState<any[]>([]);
  const [rankingData, setRankingData] = useState<RankingDataItem[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation(lang!, "common");
  const [bmus] = useAtom(bmusAtom);
  const [siteColors, setSiteColors] = useState<Record<string, string>>({});
  const [visibilityState, setVisibilityState] = useState<VisibilityState>({});
  const [activeTab, setActiveTab] = useState('distribution');
  
  // Use the centralized permissions hook
  const {
    userBMU,
    isCiaUser,
    isWbciaUser,
    isAdmin,
    getAccessibleBMUs,
    hasRestrictedAccess,
    shouldShowAggregated,
    canCompareWithOthers
  } = useUserPermissions();
  
  // Determine which BMU to use for filtering - prefer passed prop, then user's BMU
  const effectiveBMU = bmu || userBMU;
  
  // Use responsive height class instead of calculated height

  const { data: rawData } = api.gear.summaries.useQuery({ bmus });
  const selectedMetricOption = METRIC_OPTIONS.find(
    (m) => m.value === selectedMetric
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleLegendClick = (site: string) => {
    setVisibilityState((prev) => ({
      ...prev,
      [site]: {
        opacity: prev[site]?.opacity === 1 ? 0.2 : 1,
      },
    }));
  };

  // Reset to distribution tab if CIA user somehow gets to comparison tab
  useEffect(() => {
    if (isCiaUser && activeTab === 'comparison') {
      setActiveTab('distribution');
    }
  }, [isCiaUser, activeTab]);

  useEffect(() => {
    if (!rawData) return;

    try {
      setLoading(true);

      // Extract unique BMUs from the data
      const uniqueBMUs = Array.from(
        new Set(rawData.map((d: GearData) => d.BMU))
      ).sort();
      
      // Filter BMUs based on user permissions
      const accessibleBMUs = hasRestrictedAccess 
        ? getAccessibleBMUs(uniqueBMUs) 
        : uniqueBMUs;

      // Create color mapping for BMUs
      const newSiteColors = uniqueBMUs.reduce<Record<string, string>>(
        (acc, site, index) => ({
          ...acc,
          [site]: generateColor(index, site, effectiveBMU),
        }),
        {}
      );
      setSiteColors(newSiteColors);

      // Set initial visibility state based on user permissions
      const initialVisibility = uniqueBMUs.reduce<VisibilityState>(
        (acc, site) => ({
          ...acc,
          [site]: { 
            opacity: hasRestrictedAccess 
              ? (accessibleBMUs.includes(site) ? 1 : 0.2) 
              : (site === effectiveBMU ? 1 : 0.2) 
          },
        }),
        {}
      );
      setVisibilityState(initialVisibility);

      // Extract unique gear types and sort by total metric value
      const gearTypes = Array.from(
        new Set(rawData.map((d: GearData) => d.gear))
      ).sort((a, b) => {
        const aValue = rawData.reduce(
          (sum, curr) =>
            sum +
            (curr.gear === a && typeof curr[selectedMetric] === "number"
              ? curr[selectedMetric]
              : 0),
          0
        );
        const bValue = rawData.reduce(
          (sum, curr) =>
            sum +
            (curr.gear === b && typeof curr[selectedMetric] === "number"
              ? curr[selectedMetric]
              : 0),
          0
        );
        return bValue - aValue;
      });

      // Format data for the distribution bar chart
      const transformedData = gearTypes.map((gear) => {
        const gearData: any = {
          name: capitalizeGearType(gear.replace(/_/g, " ")),
        };

        // Add data for each BMU
        rawData.forEach((d: GearData) => {
          if (d.gear === gear && typeof d[selectedMetric] === "number") {
            gearData[d.BMU] = Number(d[selectedMetric].toFixed(2));
          }
        });

        return gearData;
      });

      setBarData(transformedData);

      // Format data for the ranking chart
      // Filter data based on user permissions
      const filteredRankingData = rawData.filter((d: GearData) => {
        if (hasRestrictedAccess) {
          // For CIA users, only show their assigned BMU
          return d.BMU === effectiveBMU;
        } else if (isWbciaUser && effectiveBMU) {
          // For WBCIA users with a selected BMU, filter to that BMU
          return d.BMU === effectiveBMU;
        }
        // For admins and users without restrictions, show all data
        return true;
      });
      
      const rankingData: RankingDataItem[] = gearTypes.map((gear, index) => {
        // Calculate total value for this gear (filtered for BMU if applicable)
        const totalValue = filteredRankingData
          .filter(d => d.gear === gear)
          .reduce((sum, curr) => {
            return sum + (typeof curr[selectedMetric] === "number" ? curr[selectedMetric] : 0);
          }, 0);

        return {
          name: capitalizeGearType(gear.replace(/_/g, " ")),
          value: Number(totalValue.toFixed(2)),
          fill: GEAR_COLORS[index % GEAR_COLORS.length]
        };
      }).sort((a, b) => b.value - a.value);

      // Add percentage values
      const totalSum = rankingData.reduce((sum, item) => sum + item.value, 0);
      rankingData.forEach(item => {
        item.percentage = ((item.value / totalSum) * 100).toFixed(1);
      });

      setRankingData(rankingData);

      // Format data for the comparison chart
      // For the user's BMU compared to average of others
      if (effectiveBMU) {
        const comparisonData = gearTypes.map((gear, index) => {
          // Get value for user's BMU
          const bmuValue = rawData.find(
            d => d.BMU === effectiveBMU && d.gear === gear && typeof d[selectedMetric] === "number"
          )?.[selectedMetric] || 0;

          // Get average value for other BMUs
          const otherBMUs = uniqueBMUs.filter(b => b !== effectiveBMU);
          let otherBMUsTotal = 0;
          let otherBMUsCount = 0;

          otherBMUs.forEach(otherBMU => {
            const value = rawData.find(
              d => d.BMU === otherBMU && d.gear === gear && typeof d[selectedMetric] === "number"
            )?.[selectedMetric];

            if (value) {
              otherBMUsTotal += value;
              otherBMUsCount++;
            }
          });

          const otherBMUsAvg = otherBMUsCount > 0 
            ? otherBMUsTotal / otherBMUsCount 
            : 0;

          // Difference (for sorting)
          const diff = bmuValue - otherBMUsAvg;

          return {
            name: capitalizeGearType(gear.replace(/_/g, " ")),
            [effectiveBMU]: Number(bmuValue.toFixed(2)),
            average: Number(otherBMUsAvg.toFixed(2)),
            diff: diff,
            color: GEAR_COLORS[index % GEAR_COLORS.length]
          };
        }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

        setComparisonData(comparisonData);
      }

      setError(null);
    } catch (error) {
      console.error("Error transforming data:", error);
      setError("Error processing data");
    } finally {
      setLoading(false);
    }
  }, [rawData, selectedMetric, effectiveBMU, hasRestrictedAccess, isWbciaUser, getAccessibleBMUs]);

  const getTabTitle = (tab: string): string => {
    // Custom titles for CIA users who can only see their own BMU
    if (isCiaUser && hasRestrictedAccess) {
      switch (tab) {
        case 'distribution':
          return t("text-distribution-tab-title-cia") || `Fishing Gear Performance in ${effectiveBMU}`;
        case 'ranking':
          return t("text-ranking-tab-title-cia") || `Gear Type Importance in ${effectiveBMU}`;
        default:
          return t("text-distribution-tab-title-cia") || `Fishing Gear Performance in ${effectiveBMU}`;
      }
    }
    
    // Standard titles for users who can see multiple BMUs
    switch (tab) {
      case 'distribution':
        return t("text-distribution-tab-title");
      case 'comparison':
        return t("text-comparison-tab-title");
      case 'ranking':
        return hasRestrictedAccess ? 
          t("text-ranking-tab-title") + ` (${effectiveBMU})` :
          t("text-ranking-tab-title-all");
      default:
        return t("text-distribution-tab-title");
    }
  };

  const getTabDescription = (tab: string): string => {
    // Custom descriptions for CIA users who can only see their own BMU
    if (isCiaUser && hasRestrictedAccess) {
      switch (tab) {
        case 'distribution':
          return t("text-distribution-tab-description-cia") || 
            `Shows performance metrics for different fishing gear types in your BMU (${effectiveBMU})`;
        case 'ranking':
          return t("text-ranking-tab-description-cia") || 
            `Shows the relative importance of different fishing gear types in your BMU (${effectiveBMU})`;
        default:
          return t("text-distribution-tab-description-cia") || 
            `Shows performance metrics for different fishing gear types in your BMU (${effectiveBMU})`;
      }
    }
    
    // Standard descriptions for users who can see multiple BMUs
    switch (tab) {
      case 'distribution':
        return t("text-distribution-tab-description");
      case 'comparison':
        return effectiveBMU ? 
          t("text-comparison-tab-description") + ` (${effectiveBMU})` : 
          t("text-comparison-tab-description");
      case 'ranking':
        if (hasRestrictedAccess) {
          return t("text-ranking-tab-description") + ` (${effectiveBMU})`;
        } else if (effectiveBMU) {
          return t("text-ranking-tab-description") + ` (${effectiveBMU})`;
        } else {
          return t("text-ranking-tab-description-all");
        }
      default:
        return t("text-distribution-tab-description");
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <LoadingState />;
  if (!barData || barData.length === 0) return <LoadingState />;

  // Get unique BMUs for rendering bars
  const uniqueBMUs = Object.keys(siteColors);

  return (
    <WidgetCard
      title={
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between w-full gap-3">
          <div className="w-full sm:w-auto">
          <MetricSelector
            selectedMetric={selectedMetric}
            onMetricChange={setSelectedMetric}
            selectedMetricOption={selectedMetricOption}
          />
          </div>
          <div className="hidden sm:block text-base font-medium text-gray-800 mx-auto">
            <div className="text-center">
              {getTabTitle(activeTab)}
            </div>
            <div className="text-xs text-gray-500 text-center mt-1">
              {getTabDescription(activeTab)}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              className={`px-4 py-2 text-sm rounded-md transition duration-200 ${activeTab === 'distribution' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} w-full sm:w-auto`}
              onClick={() => handleTabChange('distribution')}
            >
              {t("text-distribution-tab")}
            </button>
            {/* Only show comparison tab for non-CIA users */}
            {effectiveBMU && !isCiaUser && (
              <button
                className={`px-4 py-2 text-sm rounded-md transition duration-200 ${activeTab === 'comparison' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} w-full sm:w-auto`}
                onClick={() => handleTabChange('comparison')}
              >
                {t("text-comparison-tab")}
              </button>
            )}
            <button
              className={`px-4 py-2 text-sm rounded-md transition duration-200 ${activeTab === 'ranking' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} w-full sm:w-auto`}
              onClick={() => handleTabChange('ranking')}
            >
              {t("text-ranking-tab")}
            </button>
          </div>
        </div>
      }
      className={cn("h-full", className)}
    >
      {/* Mobile-only title - shows on small screens */}
      <div className="sm:hidden text-center mb-4">
        <div className="text-base font-medium text-gray-800">
          {getTabTitle(activeTab)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {getTabDescription(activeTab)}
        </div>
      </div>
      
      <SimpleBar>
        {/* Distribution View (default) - Bar chart showing distribution by BMU */}
        {activeTab === 'distribution' && (
          <div className="w-full h-96 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={70}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  interval={0}
                  axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                  tickLine={{ stroke: "#cbd5e1" }}
                />
                <YAxis
                  tickFormatter={(value) => formatNumber(value)}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  content={(props) => <CustomTooltip {...props} selectedMetricOption={selectedMetricOption} />} 
                  wrapperStyle={{ outline: 'none' }}
                />
                <Legend 
                  content={(props) => (
                    <CustomLegend
                      {...props}
                      visibilityState={visibilityState}
                      handleLegendClick={handleLegendClick}
                    />
                  )}
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ position: 'relative', marginTop: '10px' }}
                />
                {uniqueBMUs.map((bmu) => (
                  <Bar
                    key={bmu}
                    dataKey={bmu}
                    name={bmu}
                    fill={siteColors[bmu]}
                    stroke={siteColors[bmu]}
                    fillOpacity={(visibilityState[bmu]?.opacity || 1) * 0.85}
                    strokeOpacity={visibilityState[bmu]?.opacity || 1}
                    radius={[4, 4, 0, 0]}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Comparison View - Selected BMU vs Average of Others */}
        {activeTab === 'comparison' && effectiveBMU && (
          <div className="w-full h-[600px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis 
                  type="number"
                  tickFormatter={(value) => formatNumber(value)}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                  tickLine={{ stroke: "#cbd5e1" }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip 
                  content={(props) => <CustomTooltip {...props} selectedMetricOption={selectedMetricOption} />} 
                  wrapperStyle={{ outline: 'none' }}
                />
                <Legend 
                  content={(props) => (
                    <CustomLegend
                      {...props}
                      visibilityState={visibilityState}
                      handleLegendClick={handleLegendClick}
                    />
                  )}
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ position: 'relative', marginTop: '10px' }}
                />
                <Bar
                  dataKey={effectiveBMU}
                  name={effectiveBMU}
                  fill={siteColors[effectiveBMU] || "#fc3468"}
                  radius={[0, 4, 4, 0]}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="average"
                  name={t("text-average-of-other-bmus")}
                  fill="#94a3b8"
                  radius={[0, 4, 4, 0]}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Ranking View - Treemap instead of Pie Chart */}
        {activeTab === 'ranking' && (
          <div className="w-full h-[600px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={rankingData.filter(item => (visibilityState[item.name]?.opacity || 1) > 0.2)}
                dataKey="value"
                aspectRatio={4/3}
                stroke="#fff"
                nameKey="name"
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {rankingData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    name={entry.name}
                    fill={entry.fill} 
                    opacity={(visibilityState[entry.name]?.opacity || 1) * 0.85}
                  />
                ))}
                <Tooltip 
                  content={(props) => <TreemapTooltip {...props} selectedMetricOption={selectedMetricOption} />} 
                  wrapperStyle={{ outline: 'none' }}
                />
              </Treemap>
            </ResponsiveContainer>
            <div className="pt-4">
              <CustomLegend
                payload={rankingData.map(item => ({
                  value: item.name,
                  color: item.fill,
                  dataKey: item.name
                }))}
                visibilityState={visibilityState}
                handleLegendClick={handleLegendClick}
          />
        </div>
          </div>
        )}
      </SimpleBar>
    </WidgetCard>
  );
}

const WidgetCardTitle = ({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-medium">{title}</h2>
      {children}
    </div>
  );
};

export { MetricSelector };
