"use client";

import NextLink, { LinkProps as NextLinkProps } from 'next/link';
import { ReactNode, forwardRef, ComponentProps, useEffect, useState } from 'react';
import { languages } from '../i18n/settings';

// Global variable to store client-side language state
let clientSideLanguage: string | null = null;

// Function to get the current client language
export function getClientLanguage(): string {
  // Check if we have a cached client-side language
  if (clientSideLanguage) {
    return clientSideLanguage;
  }

  // Check browser environment
  if (typeof window !== 'undefined') {
    // Try each storage key in order of priority
    const fromLocalStorage = localStorage.getItem('selectedLanguage') || 
                            localStorage.getItem('i18nextLng') || 
                            localStorage.getItem('peskas-language');
    
    if (fromLocalStorage && ['en', 'sw'].includes(fromLocalStorage)) {
      // Cache the value for future use
      clientSideLanguage = fromLocalStorage;
      return fromLocalStorage;
    }
    
    // Also check sessionStorage as a fallback
    const fromSessionStorage = sessionStorage.getItem('selectedLanguage') || 
                              sessionStorage.getItem('i18nextLng') || 
                              sessionStorage.getItem('peskas-language');
    
    if (fromSessionStorage && ['en', 'sw'].includes(fromSessionStorage)) {
      // Cache the value and also update localStorage
      clientSideLanguage = fromSessionStorage;
      localStorage.setItem('i18nextLng', fromSessionStorage);
      localStorage.setItem('selectedLanguage', fromSessionStorage);
      localStorage.setItem('peskas-language', fromSessionStorage);
      return fromSessionStorage;
    }

    // Try HTML attributes
    const fromHTML = document.documentElement.lang;
    if (fromHTML && ['en', 'sw'].includes(fromHTML)) {
      clientSideLanguage = fromHTML;
      return fromHTML;
    }
    
    // Try data attribute as another fallback
    const fromDataAttr = document.documentElement.getAttribute('data-language');
    if (fromDataAttr && ['en', 'sw'].includes(fromDataAttr)) {
      clientSideLanguage = fromDataAttr;
      return fromDataAttr;
    }
  }

  // Default to English if nothing found
  return 'en';
}

// Function to set the client language
export function setClientLanguage(lang: string): void {
  if (['en', 'sw'].includes(lang)) {
    clientSideLanguage = lang;
  }
}

// Listen for our custom language change event
if (typeof window !== 'undefined') {
  window.addEventListener('i18n-language-changed', ((event: CustomEvent) => {
    setClientLanguage(event.detail.language);
  }) as EventListener);
}

type LinkProps = NextLinkProps & {
  children: React.ReactNode;
  lang?: string;
  className?: string;
};

/**
 * A wrapper around Next.js Link component that ensures correct language
 * prefix is used based on the current client-side language state
 */
const LanguageLink = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, lang, children, ...props }, ref) => {
    const [currentLang, setCurrentLang] = useState<string>(() => 
      lang || getClientLanguage()
    );

    // Update current language when lang prop changes
    useEffect(() => {
      if (lang && lang !== currentLang) {
        setCurrentLang(lang);
      }
    }, [lang, currentLang]);

    // Listen for language changes
    useEffect(() => {
      const handleLanguageChange = ((event: CustomEvent) => {
        setCurrentLang(event.detail.language);
      }) as EventListener;

      window.addEventListener('i18n-language-changed', handleLanguageChange);
      return () => {
        window.removeEventListener('i18n-language-changed', handleLanguageChange);
      };
    }, []);

    // Convert the href to a string 
    const rawHref = href.toString();
    
    // Only modify internal, relative links
    let processedHref = rawHref;
    
    // Skip external and special links
    if (!rawHref.startsWith('http') && 
        !rawHref.startsWith('#') && 
        !rawHref.startsWith('tel:') && 
        !rawHref.startsWith('mailto:') &&
        !rawHref.startsWith('/_next')) {
      
      // For path routes, ensure language prefix
      // First, remove ALL existing language prefixes to prevent stacking
      let cleanHref = rawHref;
      
      // Remove multiple language prefixes like /en/en/en/en/path or /en/sw/en/path
      const langPrefixPattern = /^\/(en|sw)\/((en|sw)\/)+/;
      if (langPrefixPattern.test(cleanHref)) {
        // Extract the path after all language prefixes
        const pathParts = cleanHref.split('/').filter(Boolean);
        const nonLangIndex = pathParts.findIndex((part: string) => !['en', 'sw'].includes(part));
        
        if (nonLangIndex !== -1) {
          // Rebuild path without language prefixes
          cleanHref = '/' + pathParts.slice(nonLangIndex).join('/');
        } else {
          // If path only contains language codes, use root
          cleanHref = '/';
        }
      } else {
        // Handle simple case with just one language prefix
        cleanHref = cleanHref.replace(/^\/(en|sw)(?:\/|$)/, '/');
      }
      
      // If doesn't start with slash, add it
      if (!cleanHref.startsWith('/')) {
        cleanHref = '/' + cleanHref;
      }
      
      // Add current language prefix
      processedHref = `/${currentLang}${cleanHref}`;
      
      // Fix any double slashes
      processedHref = processedHref.replace(/\/+/g, '/');
    }

    return (
      <NextLink ref={ref} href={processedHref} {...props}>
        {children}
      </NextLink>
    );
  }
);

LanguageLink.displayName = 'LanguageLink';

export default LanguageLink; 