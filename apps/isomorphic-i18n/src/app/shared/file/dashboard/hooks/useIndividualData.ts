import { api } from "@/trpc/react";
import { useUserPermissions } from "./useUserPermissions";

/**
 * Custom hook for fetching individual fisher data
 * 
 * This hook provides access to individual fisher data with proper filtering
 * based on user permissions and selected BMUs.
 */
export const useIndividualData = () => {
  const { getAccessibleBMUs } = useUserPermissions();
  
  // For now, we'll use a basic set of BMUs - this should be replaced with actual BMU data
  const accessibleBMUs = getAccessibleBMUs(['BMU1', 'BMU2', 'BMU3']); // This should come from actual BMU data
  
  // Fetch all individual data
  const {
    data: individualData,
    isLoading: isLoadingAll,
    error: errorAll,
  } = api.individualData.all.useQuery(
    { bmus: accessibleBMUs },
    { enabled: accessibleBMUs.length > 0 }
  );

  // Fetch gear summary
  const {
    data: gearData,
    isLoading: isLoadingGear,
    error: errorGear,
  } = api.individualData.gearSummary.useQuery(
    { bmus: accessibleBMUs },
    { enabled: accessibleBMUs.length > 0 }
  );

  // Fetch performance metrics
  const {
    data: performanceData,
    isLoading: isLoadingPerformance,
    error: errorPerformance,
  } = api.individualData.performanceMetrics.useQuery(
    { 
      bmus: accessibleBMUs,
      limit: 50 
    },
    { enabled: accessibleBMUs.length > 0 }
  );

  // Fetch monthly trends
  const {
    data: monthlyTrendsData,
    isLoading: isLoadingTrends,
    error: errorTrends,
  } = api.individualData.monthlyTrends.useQuery(
    { 
      bmus: accessibleBMUs,
      metric: 'fisher_cpue'
    },
    { enabled: accessibleBMUs.length > 0 }
  );

  return {
    // Data
    individualData,
    gearData,
    performanceData,
    monthlyTrendsData,
    
    // Loading states
    isLoadingAll,
    isLoadingGear,
    isLoadingPerformance,
    isLoadingTrends,
    isLoading: isLoadingAll || isLoadingGear || isLoadingPerformance || isLoadingTrends,
    
    // Error states
    errorAll,
    errorGear,
    errorPerformance,
    errorTrends,
    hasError: !!(errorAll || errorGear || errorPerformance || errorTrends),
    
    // Utility
    accessibleBMUs,
  };
};

export default useIndividualData; 