"use client";

import i18next from "i18next";
import {
  initReactI18next,
  useTranslation as useTranslationOrg,
} from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import resourcesToBackend from "i18next-resources-to-backend";
import { getOptions } from "@/app/i18n/settings";
import { useEffect } from "react";

const runsOnServerSide = typeof window === "undefined";

// on client side the normal singleton is ok
i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`./locales/${language}/${namespace}.json`)
    )
  )
  .init({
    ...getOptions(),
    lng: undefined, // let detect the language on client side
    detection: {
      order: ["localStorage", "path", "htmlTag", "cookie", "navigator"],
      lookupLocalStorage: "selectedLanguage", // Use our custom localStorage key first
      caches: ['localStorage'], // Store language in localStorage
    },
    preload: runsOnServerSide ? getOptions().supportedLngs : [],
  });

export function useTranslation(lang: string, ns?: string, options?: object) {
  const ret = useTranslationOrg(ns, options);
  const { i18n } = ret;
  
  if (runsOnServerSide && i18n.resolvedLanguage !== lang) {
    i18next.changeLanguage(lang);
  } else {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      // Check both passed language and localStorage
      const storedLang = typeof window !== 'undefined' ? 
        localStorage.getItem('selectedLanguage') : null;
      
      // Determine which language to use (URL or localStorage)
      // Priority: URL language parameter > localStorage > current i18n language
      const targetLang = (lang && ['en', 'sw'].includes(lang)) ? 
        lang : (storedLang && ['en', 'sw'].includes(storedLang)) ? 
          storedLang : i18n.resolvedLanguage || 'en';
      
      if (i18n.resolvedLanguage !== targetLang) {
        i18n.changeLanguage(targetLang);
        // Store selection in localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedLanguage', targetLang);
        }
      }
    }, [lang, i18n]);
  }
  
  return ret;
}
