'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

const GTAG_ID = 'G-8VBFKQ4E01';

export default function UserAnalyticsTracker() {
  const { data: session, status } = useSession();
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per session and when user is authenticated
    if (
      status === 'authenticated' && 
      session?.user && 
      !hasTracked.current &&
      typeof window !== 'undefined' && 
      window.gtag
    ) {
      const userGroups = (session.user.groups as any[]) || [];
      const userRoles = userGroups.map((group: any) => group.name).join(', ') || 'no_role';
      const userPermissions = userGroups.flatMap((group: any) => 
        group.permission_id?.domain?.map((d: any) => d.resource) || []
      ).join(', ') || 'no_permissions';
      const userBmu = (session.user.userBmu as any)?.BMU || 'no_bmu';
      const hasFisherId = session.user.fisherId ? 'yes' : 'no';

      // Set user properties for ongoing session tracking
      window.gtag('config', GTAG_ID, {
        user_id: session.user.id,
        user_properties: {
          user_roles: userRoles,
          user_bmu: userBmu,
          user_permissions: userPermissions,
          has_fisher_id: hasFisherId
        },
        custom_map: {
          custom_dimension_1: 'user_roles',
          custom_dimension_2: 'user_bmu',
          custom_dimension_3: 'user_permissions'
        }
      });

      // Track authenticated session with user data
      window.gtag('event', 'authenticated_session', {
        event_category: 'user_engagement',
        user_id: session.user.id,
        user_roles: userRoles,
        user_permissions: userPermissions,
        user_bmu: userBmu,
        has_fisher_id: hasFisherId,
        user_groups_count: userGroups.length
      });

      hasTracked.current = true;
    }
  }, [session, status]);

  // Reset tracking flag when user logs out
  useEffect(() => {
    if (status === 'unauthenticated') {
      hasTracked.current = false;
    }
  }, [status]);

  return null;
}

// Add TypeScript declaration for gtag
declare global {
  interface Window {
    gtag: (
      command: string,
      targetId: string,
      config?: Record<string, any>
    ) => void;
  }
}