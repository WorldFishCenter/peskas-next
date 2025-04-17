'use client';

import { useEffect } from 'react';
import { useTranslation } from './client';
import Script from 'next/script';

/**
 * Simple inline script that runs before React hydration
 * to set the language from localStorage
 */
const earlyInitScript = `
  try {
    var storedLang = localStorage.getItem('selectedLanguage') || localStorage.getItem('i18nextLng');
    if (storedLang && ['en', 'sw'].includes(storedLang)) {
      document.documentElement.lang = storedLang;
    }
  } catch (e) {
    console.error('Error in language init script:', e);
  }
`;

export default function LanguageInitializer({ lang }: { lang?: string }) {
  const { i18n } = useTranslation(lang || 'en');

  // Apply language on component mount and when changes occur
  useEffect(() => {
    // Priority order for language detection:
    // 1. URL lang parameter (from Next.js)
    // 2. localStorage selectedLanguage
    // 3. localStorage i18nextLng
    // 4. Default to 'en'
    
    const urlLang = lang;
    const storedLang = typeof window !== 'undefined' ? 
      localStorage.getItem('selectedLanguage') || localStorage.getItem('i18nextLng') : 
      null;
    
    // Determine which language to use (only accept valid languages)
    const targetLang = (urlLang && ['en', 'sw'].includes(urlLang)) ? 
      urlLang : 
      (storedLang && ['en', 'sw'].includes(storedLang)) ? 
        storedLang : 
        'en';
    
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedLanguage', targetLang);
      localStorage.setItem('i18nextLng', targetLang);
      document.documentElement.lang = targetLang;
    }
    
    // Change language if needed
    if (i18n.language !== targetLang) {
      i18n.changeLanguage(targetLang);
    }
  }, [lang, i18n]);

  // Render the initialization script
  return (
    <>
      <Script id="language-early-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: earlyInitScript }} />
    </>
  );
} 