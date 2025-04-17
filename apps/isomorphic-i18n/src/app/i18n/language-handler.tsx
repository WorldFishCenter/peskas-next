'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from './client';
import { setDocumentLanguage, getDocumentLanguage, fixUrlLanguage } from './utils';

/**
 * Global component to handle language persistence across page navigation
 */
export default function LanguageHandler({ lang }: { lang?: string }) {
  const { i18n } = useTranslation(lang || 'en');
  const pathname = usePathname();
  const router = useRouter();
  const initialized = useRef(false);

  // Set initial language from URL or localStorage when component mounts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (initialized.current) return;
    
    // Get the detected language from all sources
    const detectedLang = getDocumentLanguage();
    
    // Set document attributes and localStorage values
    setDocumentLanguage(detectedLang);
    
    // Apply the language if different from current
    if (i18n.language !== detectedLang) {
      i18n.changeLanguage(detectedLang);
    }
    
    initialized.current = true;
  }, [i18n, pathname]);

  // Listen for navigation events to maintain language
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Function to handle route change events
    const handleRouteChange = () => {
      try {
        const savedLang = getDocumentLanguage();
        
        // Validate we have a correct language
        if (!['en', 'sw'].includes(savedLang)) {
          return; // Skip invalid languages
        }
        
        // Fix URL if it doesn't match saved language
        if (pathname) {
          // Check for common path pattern that might cause loops
          if (pathname.includes('/common/common')) {
            console.error('Loop detected in URL:', pathname);
            // Don't try to fix URLs that have loops
            return;
          }
          
          // Make sure we're not applying changes to API routes or other special routes
          if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
            return;
          }
          
          const newPath = fixUrlLanguage(pathname, savedLang);
          
          // Only update if the path would actually change and isn't already in a loop
          if (newPath !== pathname && !newPath.includes('/common/common')) {
            window.history.replaceState({ lang: savedLang }, '', newPath);
          }
        }
        
        // Ensure language is applied to i18n
        if (i18n.language !== savedLang) {
          i18n.changeLanguage(savedLang);
        }
        
        // Reset document attributes (useful for route transitions)
        setDocumentLanguage(savedLang);
      } catch (error) {
        console.error('Error handling route change:', error);
      }
    };

    // Run once on mount
    handleRouteChange();

    // Listen to Next.js navigation events
    window.addEventListener('popstate', handleRouteChange);
    
    // Create custom event listeners for Next.js router
    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      const result = originalPushState.apply(this, args);
      window.dispatchEvent(new Event('pushstate'));
      window.dispatchEvent(new Event('locationchange'));
      return result;
    };
    
    window.addEventListener('pushstate', handleRouteChange);
    window.addEventListener('locationchange', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('pushstate', handleRouteChange);
      window.removeEventListener('locationchange', handleRouteChange);
      window.history.pushState = originalPushState;
    };
  }, [i18n, pathname, router]);

  // This component doesn't render anything
  return null;
} 