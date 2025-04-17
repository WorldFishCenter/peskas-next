// Utility functions for language handling

/**
 * Sets the language in localStorage and document attributes
 * @param lang The language code to set
 */
export function setDocumentLanguage(lang: string): void {
  if (typeof window === 'undefined') return;

  // Store in localStorage for persistence
  localStorage.setItem('peskas-language', lang);
  localStorage.setItem('i18nextLng', lang);
  
  // Set on document for immediate access by components
  document.documentElement.setAttribute('data-language', lang);
  document.documentElement.setAttribute('data-language-ready', 'true');
  document.documentElement.lang = lang;
}

/**
 * Gets the current language from various sources
 * @returns The detected language or default to 'en'
 */
export function getDocumentLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  
  // Try to get language from different sources in order of priority
  const savedLang = localStorage.getItem('peskas-language');
  
  // Extract language from URL path
  let urlLang = '';
  const pathParts = window.location.pathname.split('/');
  if (pathParts.length > 1 && pathParts[1]) {
    urlLang = pathParts[1];
  }
  
  const htmlLang = document.documentElement.lang;
  const dataLang = document.documentElement.getAttribute('data-language');
  const storedLang = localStorage.getItem('i18nextLng');
  
  // Find the first valid language from all sources
  const possibleLangs = [savedLang, dataLang, urlLang, htmlLang, storedLang];
  for (const lang of possibleLangs) {
    if (lang && ['en', 'sw'].includes(lang)) {
      return lang;
    }
  }
  
  // Default to English if no valid language is found
  return 'en';
}

/**
 * Fixes a URL to use the correct language prefix
 * @param url The URL to fix
 * @param lang The language to use
 * @returns A URL with the correct language prefix
 */
export function fixUrlLanguage(url: string, lang: string): string {
  if (!url) return url;
  
  // Only allow valid language codes
  if (!['en', 'sw'].includes(lang)) {
    lang = 'en'; // Default to English for safety
  }
  
  // Check if URL already has a language prefix - only match exact language codes
  const langRegex = /^\/(en|sw)(?:\/|$)/;
  const hasLangPrefix = langRegex.test(url);
  
  if (hasLangPrefix) {
    // Replace existing language prefix only if it's a valid language code
    return url.replace(langRegex, `/${lang}/`).replace(/\/+/g, '/');
  } else {
    // Add language prefix if not present
    return `/${lang}${url.startsWith('/') ? url : `/${url}`}`.replace(/\/+/g, '/');
  }
}

/**
 * Script to add to the page head to set language attributes before page load
 * Prevents flash of wrong language
 */
export const languageInitScript = `
  (function() {
    try {
      var savedLang = localStorage.getItem('peskas-language');
      var i18nLang = localStorage.getItem('i18nextLng');
      var lang = savedLang || i18nLang || 'en';
      
      // Only allow valid language codes
      if (!['en', 'sw'].includes(lang)) {
        lang = 'en'; // Default to English for safety
      }
      
      // Set attributes immediately
      document.documentElement.setAttribute('data-language', lang);
      document.documentElement.setAttribute('data-language-ready', 'true');
      document.documentElement.lang = lang;
      
      // Check if URL needs fixing
      var path = window.location.pathname;
      var langRegex = /^\\/(en|sw)(?:\\/|$)/;
      var hasLangPrefix = langRegex.test(path);
      var urlLang = hasLangPrefix ? path.split('/')[1] : null;
      
      // Only modify URL if the language prefix is different from the saved language
      // and both are valid language codes
      if (urlLang && urlLang !== lang && ['en', 'sw'].includes(urlLang) && ['en', 'sw'].includes(lang)) {
        // Fix URL if needed - without page reload
        var newPath = path.replace(langRegex, '/' + lang + '/').replace(/\\/+/g, '/');
        if (newPath !== path) {
          window.history.replaceState({}, '', newPath);
        }
      }
    } catch (e) {
      console.error('Language init script error:', e);
    }
  })();
`; 