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
  const lastFixedPath = useRef('');

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
          // Skip special routes
          if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
            return;
          }
          
          const newPath = fixUrlLanguage(pathname, savedLang);
          
          // Only update if the path would actually change and we haven't just done this fix
          if (newPath !== pathname && newPath !== lastFixedPath.current) {
            lastFixedPath.current = newPath;
            window.history.replaceState({ lang: savedLang }, '', newPath);
            
            // If this is a completely different page, consider it a proper navigation
            if (pathname.split('/').slice(2).join('/') !== newPath.split('/').slice(2).join('/')) {
              // Force router update to ensure consistent Next.js state
              router.replace(newPath);
            }
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

    // Handle Next.js client-side navigation events
    const handleBeforeHistoryChange = () => {
      setTimeout(handleRouteChange, 0);
    };

    // Listen to various events that might indicate navigation
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('beforeunload', handleRouteChange);
    
    // Create a MutationObserver to detect DOM changes that might indicate navigation
    const observer = new MutationObserver((mutations) => {
      setTimeout(handleRouteChange, 0);
    });
    
    observer.observe(document.documentElement, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['href']
    });
    
    // Intercept link clicks to ensure language prefix is preserved
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href && link.href.startsWith(window.location.origin)) {
        const path = link.href.replace(window.location.origin, '');
        const savedLang = getDocumentLanguage();
        const fixedPath = fixUrlLanguage(path, savedLang);
        
        if (fixedPath !== path) {
          e.preventDefault();
          router.push(fixedPath);
        }
      }
    });

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('beforeunload', handleRouteChange);
      observer.disconnect();
    };
  }, [i18n, pathname, router]);

  // This component doesn't render anything
  return null;
} 