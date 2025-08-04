import { api } from "@/trpc/react";
import { useMemo } from "react";
import useUserPermissions from './useUserPermissions';

interface UseIndividualGearDataOptions {
  startDate?: Date | null;
  endDate?: Date;
}

/**
 * Custom hook for fetching individual gear data
 * 
 * This hook provides access to individual fisher gear data with proper filtering
 * based on user permissions and selected BMUs.
 */
export const useIndividualGearData = (options?: UseIndividualGearDataOptions) => {
  const { startDate, endDate } = options || {};
  const { userFisherId, shouldShowIndividualData, referenceBMU } = useUserPermissions();
  
  // Only fetch individual gear data for users who should see individual data (IIA users and admin-fishers)
  const {
    data: fisherGearData,
    isLoading: isLoadingFisherGearData,
    error: errorFisherGearData,
  } = api.individualGearData.byFisher.useQuery(
    { 
      fisher_id: userFisherId || '',
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    },
    { enabled: shouldShowIndividualData && !!userFisherId }
  );

  // Fetch BMU average data (excluding current fisher) for comparison
  const {
    data: bmuGearAverageData,
    isLoading: isLoadingBmuGearAverage,
    error: errorBmuGearAverage,
  } = api.individualGearData.bmuAverage.useQuery(
    { 
      BMU: referenceBMU || '',
      excludeFisherId: userFisherId || '',
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    },
    { enabled: shouldShowIndividualData && !!userFisherId && !!referenceBMU }
  );

  // Process and format the gear data for chart consumption
  const processedGearData = useMemo(() => {
    if (!fisherGearData || fisherGearData.length === 0) return [];
    
    // Group by gear type and calculate averages
    const gearGroups: Record<string, {
      gear: string;
      totalCpue: number;
      totalRpue: number;
      totalCosts: number;
      totalProfit: number;
      count: number;
    }> = {};
    
    fisherGearData.forEach(item => {
      if (!gearGroups[item.gear]) {
        gearGroups[item.gear] = {
          gear: item.gear,
          totalCpue: 0,
          totalRpue: 0,
          totalCosts: 0,
          totalProfit: 0,
          count: 0
        };
      }
      
      gearGroups[item.gear].totalCpue += item.mean_cpue;
      gearGroups[item.gear].totalRpue += item.mean_rpue;
      gearGroups[item.gear].totalCosts += item.mean_costs;
      gearGroups[item.gear].totalProfit += item.mean_profit;
      gearGroups[item.gear].count += 1;
    });
    
    // Calculate averages
    return Object.values(gearGroups).map(group => ({
      gear: group.gear,
      mean_cpue: group.totalCpue / group.count,
      mean_rpue: group.totalRpue / group.count,
      mean_costs: group.totalCosts / group.count,
      mean_profit: group.totalProfit / group.count,
      trip_count: group.count
    }));
  }, [fisherGearData]);

  // Process BMU average data for comparison
  const processedBmuAverageData = useMemo(() => {
    if (!bmuGearAverageData || bmuGearAverageData.length === 0) return [];
    
    // Group by gear type and calculate averages
    const gearGroups: Record<string, {
      gear: string;
      totalCpue: number;
      totalRpue: number;
      totalCosts: number;
      totalProfit: number;
      count: number;
    }> = {};
    
    bmuGearAverageData.forEach(item => {
      if (!gearGroups[item.gear]) {
        gearGroups[item.gear] = {
          gear: item.gear,
          totalCpue: 0,
          totalRpue: 0,
          totalCosts: 0,
          totalProfit: 0,
          count: 0
        };
      }
      
      gearGroups[item.gear].totalCpue += item.mean_cpue;
      gearGroups[item.gear].totalRpue += item.mean_rpue;
      gearGroups[item.gear].totalCosts += item.mean_costs;
      gearGroups[item.gear].totalProfit += item.mean_profit;
      gearGroups[item.gear].count += 1;
    });
    
    // Calculate averages
    return Object.values(gearGroups).map(group => ({
      gear: group.gear,
      mean_cpue: group.totalCpue / group.count,
      mean_rpue: group.totalRpue / group.count,
      mean_costs: group.totalCosts / group.count,
      mean_profit: group.totalProfit / group.count,
      fisher_count: group.count
    }));
  }, [bmuGearAverageData]);

  return {
    // Raw data
    fisherGearData,
    bmuGearAverageData,
    
    // Processed data for charts
    processedGearData,
    processedBmuAverageData,
    
    // Loading states
    isLoadingFisherGearData,
    isLoadingBmuGearAverage,
    isLoading: isLoadingFisherGearData || isLoadingBmuGearAverage,
    
    // Errors
    errorFisherGearData,
    errorBmuGearAverage,
    hasError: !!errorFisherGearData || !!errorBmuGearAverage,
  };
};

export default useIndividualGearData;