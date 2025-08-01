import { api } from "@/trpc/react";
import { useUserPermissions } from "./useUserPermissions";
import { useSession } from "next-auth/react";

interface UseIndividualDataOptions {
  startDate?: Date | null;
  endDate?: Date;
}

/**
 * Custom hook for fetching individual fisher data
 * 
 * This hook provides access to individual fisher data with proper filtering
 * based on user permissions and selected BMUs.
 */
export const useIndividualData = (options?: UseIndividualDataOptions) => {
  const { startDate, endDate } = options || {};
  const { getAccessibleBMUs, isIiaUser, userFisherId } = useUserPermissions();
  const { data: session } = useSession();
  
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
      metric: 'mean_cpue'
    },
    { enabled: accessibleBMUs.length > 0 }
  );

  // IIA-specific queries - only enabled for IIA users with a valid fisherId
  const {
    data: fisherData,
    isLoading: isLoadingFisherData,
    error: errorFisherData,
  } = api.individualData.byFisherId.useQuery(
    { 
      fisherId: userFisherId || '',
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    },
    { enabled: isIiaUser && !!userFisherId }
  );

  const {
    data: fisherMonthlyTrends,
    isLoading: isLoadingFisherTrends,
    error: errorFisherTrends,
  } = api.individualData.fisherMonthlyTrends.useQuery(
    { 
      fisherId: userFisherId || '',
      metric: 'mean_cpue'
    },
    { enabled: isIiaUser && !!userFisherId }
  );

  const {
    data: fisherPerformanceSummary,
    isLoading: isLoadingFisherSummary,
    error: errorFisherSummary,
  } = api.individualData.fisherPerformanceSummary.useQuery(
    { 
      fisherId: userFisherId || '',
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    },
    { enabled: isIiaUser && !!userFisherId }
  );

  // Fetch individual fish distribution for the current fisher (for IIA users)
  const {
    data: individualFishDistribution,
    isLoading: isLoadingIndividualFishDistribution,
    error: errorIndividualFishDistribution,
  } = api.individualData.individualFishDistributionByFisher.useQuery(
    {
      fisherId: userFisherId || '',
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    },
    { enabled: isIiaUser && !!userFisherId }
  );

  return {
    // Data
    individualData,
    performanceData,
    monthlyTrendsData,
    fisherData,
    fisherMonthlyTrends,
    fisherPerformanceSummary,
    individualFishDistribution,
    
    // Loading states
    isLoadingAll,
    isLoadingPerformance,
    isLoadingTrends,
    isLoadingFisherData,
    isLoadingFisherTrends,
    isLoadingFisherSummary,
    isLoadingIndividualFishDistribution,
    isLoading: isLoadingAll || isLoadingPerformance || isLoadingTrends || isLoadingFisherData || isLoadingFisherTrends || isLoadingFisherSummary || isLoadingIndividualFishDistribution,
    
    // Error states
    errorAll,
    errorPerformance,
    errorTrends,
    errorFisherData,
    errorFisherTrends,
    errorFisherSummary,
    errorIndividualFishDistribution,
    hasError: !!(errorAll || errorPerformance || errorTrends || errorFisherData || errorFisherTrends || errorFisherSummary || errorIndividualFishDistribution),
    
    // Utility
    accessibleBMUs,
  };
};

export default useIndividualData; 