"use client";

import { useState, useEffect, useMemo } from "react";
import { useAtom } from "jotai";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import WidgetCard from "@components/cards/widget-card";
import { api } from "@/trpc/react";
import { bmusAtom } from "@/app/components/filter-selector";
import { useTranslation } from "@/app/i18n/client";
import SimpleBar from "@ui/simplebar";
import useUserPermissions from "./hooks/useUserPermissions";
import { generateFishCategoryColor } from "./charts/utils";

// Define fish category display data
interface CategoryDisplay {
  id: string;
  name: string;
  color: string;
}

interface FishCompositionComparisonProps {
  className?: string;
  lang?: string;
  bmu?: string;
}

// Define visibility state type
interface VisibilityState {
  [key: string]: {
    opacity: number;
  };
}

const LoadingState = () => {
  const { t } = useTranslation("common");
  return (
    <WidgetCard title="">
      <div className="h-96 w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          <span className="text-sm text-gray-500">{t("text-loading")}</span>
        </div>
      </div>
    </WidgetCard>
  );
};

export default function FishCompositionComparison({ 
  className, 
  lang, 
  bmu
}: FishCompositionComparisonProps) {
  const { t } = useTranslation(lang!, "common");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [categoryDisplays, setCategoryDisplays] = useState<CategoryDisplay[]>([]);
  const [visibilityState, setVisibilityState] = useState<VisibilityState>({});
  const [bmus] = useAtom(bmusAtom);
  
  // Get BMUs based on permissions
  const { userBMU, isAdmin, hasRestrictedAccess } = useUserPermissions();
  const effectiveBMU = bmu || userBMU;
  
  // Memoize queryBmus to prevent it from recalculating on every render
  const queryBmus = useMemo(() => {
    return isAdmin 
      ? bmus 
      : (hasRestrictedAccess ? [effectiveBMU].filter(Boolean) as string[] : bmus);
  }, [isAdmin, hasRestrictedAccess, effectiveBMU, bmus]);
  
  // Get fish distribution data from the API
  const { data: fishDistributionData, isLoading: isLoadingData, error: apiError } = api.fishDistribution.monthlyTrends.useQuery({ 
    bmus: queryBmus,
  }, {
    retry: 3,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5,
    enabled: queryBmus.length > 0,
  });

  // Handle legend item click
  const handleLegendClick = (categoryId: string) => {
    setVisibilityState(prev => {
      const newState = { ...prev };
      
      // Toggle the opacity for this category
      newState[categoryId] = {
        opacity: prev[categoryId]?.opacity === 1 ? 0.2 : 1
      };
      
      return newState;
    });
  };
  
  // Memoize the initialization of visibility state to prevent it from changing on each render
  useEffect(() => {
    if (categoryDisplays.length > 0 && Object.keys(visibilityState).length === 0) {
      const initialVisibility: VisibilityState = {};
      categoryDisplays.forEach(category => {
        initialVisibility[category.id] = { opacity: 1 };
      });
      setVisibilityState(initialVisibility);
    }
  }, [categoryDisplays, visibilityState]);
  
  // Process data when it changes
  useEffect(() => {
    if (isLoadingData || queryBmus.length === 0) {
      setLoading(true);
      return;
    }
    
    if (queryBmus.length === 0) {
      setError("No BMUs selected. Please select at least one BMU.");
      setLoading(false);
      return;
    }
    
    if (apiError) {
      setError("Failed to load fish distribution data");
      setLoading(false);
      return;
    }
    
    if (!fishDistributionData) {
      setError("No fish distribution data available");
      setLoading(false);
      return;
    }
    
    try {
      // Process the fish category data
      const totals: Record<string, Record<string, number>> = {};
      const categories: Set<string> = new Set();
      
      // Initialize totals object for each BMU
      queryBmus.forEach(bmu => {
        totals[bmu] = {};
      });
      
      // Process the monthly data
      fishDistributionData.forEach(monthData => {
        const bmuName = monthData.landing_site;
        
        // Skip if this BMU isn't in our query list
        if (!queryBmus.includes(bmuName)) return;
        
        // Process categories for this month/BMU
        if (monthData.categories && Array.isArray(monthData.categories)) {
          monthData.categories.forEach((cat: { category: string; total_catch: number }) => {
            // Ensure we have a valid category name and catch value
            if (!cat.category) return;
            
            const categoryName = cat.category;
            categories.add(categoryName);
            
            // Initialize category for this BMU if it doesn't exist
            if (!totals[bmuName][categoryName]) {
              totals[bmuName][categoryName] = 0;
            }
            
            // Only add to the total if we have a valid catch amount
            if (cat.total_catch !== undefined && cat.total_catch !== null) {
              totals[bmuName][categoryName] += cat.total_catch;
            }
          });
        }
      });
      
      // Convert to array of category objects with colors
      const categoryArray = Array.from(categories).map((category) => {
        console.log(`Fish category: "${category}" → color: ${generateFishCategoryColor(category)}`);
        return {
          id: category.toLowerCase().replace(/\s+/g, '_'),
          name: category,
          color: generateFishCategoryColor(category)
        };
      });
      
      setCategoryDisplays(categoryArray);
      
      // Create chart data for each BMU
      const chartDataArray = queryBmus.map(bmu => {
        // Calculate total catch for this BMU
        let totalCatch = 0;
        Object.values(totals[bmu]).forEach(value => {
          totalCatch += value;
        });
        
        // Create the base data object
        const bmuData: any = {
          bmu,
          bmuName: bmu,
          totalCatch,
        };
        
        // Add percentage values for each category
        if (totalCatch > 0) {
          // Calculate percentages
          let totalPercentage = 0;
          
          categoryArray.forEach(category => {
            const value = totals[bmu][category.name] || 0;
            const percentage = Math.floor((value / totalCatch) * 100);
            bmuData[category.id] = percentage;
            totalPercentage += percentage;
          });
          
          // Adjust to ensure total is 100%
          if (totalPercentage !== 100) {
            // Find the largest category
            let largestCategory = null;
            let largestValue = -1;
            
            categoryArray.forEach(category => {
              if (bmuData[category.id] > largestValue) {
                largestValue = bmuData[category.id];
                largestCategory = category.id;
              }
            });
            
            // Adjust the largest category
            if (largestCategory) {
              bmuData[largestCategory] += (100 - totalPercentage);
            }
          }
        } else {
          // If no catch data, set all categories to 0
          categoryArray.forEach(category => {
            bmuData[category.id] = 0;
          });
        }
        
        return bmuData;
      });
      
      // Include all BMUs in the chart and sort by name
      const filteredData = chartDataArray
        .sort((a, b) => a.bmuName.localeCompare(b.bmuName));
      
      setChartData(filteredData);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError("Error processing data");
      setLoading(false);
    }
  }, [fishDistributionData, isLoadingData, apiError, queryBmus]);
  
  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-md shadow-md">
          <p className="font-medium text-gray-900">{label}</p>
          <div className="mt-2 space-y-1">
            {payload.map((entry: any, index: number) => {
              // Check if the value is undefined, null, or 0 when it should be N/A
              const isValidValue = entry.value !== undefined && entry.value !== null;
              const displayValue = isValidValue ? `${entry.value}%` : t("text-na");
              
              return (
                <div key={`tooltip-${index}`} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-gray-700">
                    {entry.name}: {displayValue}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };
  
  // Interactive legend component similar to fish-composition-chart.tsx
  const CustomLegend = () => {
    return (
      <div className="flex justify-center mt-6">
        <div className="inline-flex flex-wrap justify-center gap-4">
          {categoryDisplays.map((category) => (
            <div 
              key={category.id} 
              className="flex items-center gap-2 cursor-pointer transition-opacity duration-200 px-2 py-1 rounded hover:bg-gray-100"
              onClick={() => handleLegendClick(category.id)}
            >
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ 
                  backgroundColor: category.color,
                  opacity: visibilityState[category.id]?.opacity ?? 1 
                }}
              />
              <span 
                className="text-sm text-gray-700 whitespace-nowrap"
                style={{ opacity: visibilityState[category.id]?.opacity ?? 1 }}
              >
                {category.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <WidgetCard
      title={
        loading ? "" : (
          <div className="flex items-center justify-center w-full">
            <div className="text-base font-medium text-gray-800">
              <div className="text-center">
                {t("text-fish-composition-by-bmu") || "Fish Composition by BMU"}
              </div>
              <div className="text-xs text-gray-500 text-center mt-1">
                {t("text-comparison-chart-description") || "Compare fish group distribution across BMUs"}
              </div>
            </div>
          </div>
        )
      }
      className="h-full"
    >
      {loading ? (
        <div className="h-96 w-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-500">{t("text-loading")}</span>
          </div>
        </div>
      ) : error ? (
        <div className="h-96 w-full flex items-center justify-center">
          <p className="text-gray-500">{error}</p>
        </div>
      ) : (
        <SimpleBar className="h-full">
          <div className="p-4 md:p-6 h-full">
            {/* Main Chart */}
            <div className="h-[400px] md:h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  barSize={75} 
                  barGap={1}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    unit="%" 
                    domain={[0, 100]} 
                    ticks={[0, 25, 50, 75, 100]}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    dataKey="bmuName" 
                    type="category" 
                    width={100}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Stack bars for each fish category with visibility state */}
                  {categoryDisplays.map((category) => {
                    // Extra check to ensure color is correctly assigned
                    const categoryColor = category.color || generateFishCategoryColor(category.name);
                    
                    return (
                      <Bar 
                        key={category.id}
                        dataKey={category.id}
                        name={category.name}
                        stackId="a"
                        fill={categoryColor}
                        radius={[0, 0, 0, 0]}
                        fillOpacity={visibilityState[category.id]?.opacity ?? 1}
                        hide={visibilityState[category.id]?.opacity === 0}
                        isAnimationActive={false}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Interactive legend */}
            <CustomLegend />
          </div>
        </SimpleBar>
      )}
    </WidgetCard>
  );
} 