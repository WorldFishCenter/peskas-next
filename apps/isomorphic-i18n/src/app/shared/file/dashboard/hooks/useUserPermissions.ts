import { useSession } from "next-auth/react";

/**
 * Centralized hook for user permission management
 * 
 * Provides consistent access to user role/permission information and helper functions
 * for determining what data a user can access based on their role.
 */
export const useUserPermissions = () => {
  const { data: session } = useSession();
  
  // Check user groups for permission levels with safety checks
  const hasGroups = Array.isArray(session?.user?.groups);
  
  const isCiaUser = hasGroups && session?.user?.groups?.some(
    (group: { name: string }) => group.name === 'CIA'
  );
  
  const isWbciaUser = hasGroups && session?.user?.groups?.some(
    (group: { name: string }) => group.name === 'WBCIA'
  );
  
  const isAdmin = hasGroups && session?.user?.groups?.some(
    (group: { name: string }) => group.name === 'admin' || group.name === 'Admin'
  );
  
  // Get user's BMU - properly handle the property path
  const userBMU = session?.user?.userBmu?.BMU;
  
  /**
   * Determines which BMUs the user can access based on their role
   * 
   * @param allBMUs - Array of all available BMUs
   * @returns Array of BMUs the user has access to
   */
  const getAccessibleBMUs = (allBMUs: string[]): string[] => {
    if (isAdmin) {
      // Admins can see all BMUs
      return allBMUs;
    } else if (isWbciaUser) {
      // WBCIA users can see BMUs in their region (for now, assuming they can see all)
      // This would need to be enhanced with region filtering logic
      return allBMUs;
    } else if (isCiaUser && userBMU) {
      // CIA users can only see their assigned BMU
      return [userBMU];
    } else {
      // Default fallback - show all but with limited interactions
      return allBMUs;
    }
  };
  
  return {
    // User information
    userBMU,
    
    // Role checks
    isCiaUser,
    isWbciaUser,
    isAdmin,
    
    // Helper functions
    getAccessibleBMUs,
    
    // Useful flags for components
    hasRestrictedAccess: isCiaUser && !!userBMU,
    shouldShowAggregated: isAdmin || isWbciaUser,
    canCompareWithOthers: !isCiaUser || isAdmin || isWbciaUser,
  };
};

export default useUserPermissions; 