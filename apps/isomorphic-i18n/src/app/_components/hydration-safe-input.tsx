import { ReactNode } from 'react';

/**
 * Wrapper component to suppress hydration warnings for input fields
 * that may have attributes injected by password managers (Dashlane, 1Password, etc.)
 * 
 * These managers inject attributes like:
 * - data-dashlane-rid
 * - data-dashlane-classification  
 * - data-kwimpalastatus
 * - data-kwimpalaid
 * 
 * This causes hydration mismatches since these attributes are not present during SSR
 */
export default function HydrationSafeInput({ children }: { children: ReactNode }) {
  return <div suppressHydrationWarning>{children}</div>;
} 