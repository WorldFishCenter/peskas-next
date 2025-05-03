"use client";

import { useState, useEffect } from 'react';
import { SWFlag } from "@components/icons/language/SWFlag";
import { USFlag } from "@components/icons/language/USFlag";
import cn from '@utils/class-names';
import { useTranslation } from "./client";
import { getClientLanguage, setClientLanguage } from './language-link';

// Define language options with their icons
const languageOptions = [
  {
    id: 1,
    name: "EN",
    value: "en",
    icon: <USFlag />,
  },
  {
    id: 2,
    name: "SW",
    value: "sw",
    icon: <SWFlag />,
  },
];

// Global function to change language throughout the app
export function changeAppLanguage(newLang: string): void {
  if (!['en', 'sw'].includes(newLang)) return;
  
  // Save current scroll position
  const scrollPosition = window.scrollY || document.documentElement.scrollTop;
  
  // Update localStorage
  localStorage.setItem('i18nextLng', newLang);
  localStorage.setItem('selectedLanguage', newLang);
  localStorage.setItem('peskas-language', newLang);
  
  // Update document attributes
  document.documentElement.setAttribute('data-language', newLang);
  document.documentElement.setAttribute('data-language-ready', 'true');
  document.documentElement.lang = newLang;
  
  // Update central client language state
  setClientLanguage(newLang);
  
  // Update i18next directly if possible
  try {
    const i18n = require('i18next').default;
    i18n.changeLanguage(newLang);
  } catch (e) {
    // i18next might not be available directly
  }
  
  // Broadcast the change to all components
  window.dispatchEvent(new CustomEvent('i18n-language-changed', {
    detail: { language: newLang }
  }));
  
  // Restore scroll position after a short delay to ensure DOM updates
  setTimeout(() => {
    window.scrollTo(0, scrollPosition);
  }, 50);
}

/**
 * Language switcher component that uses the global language change function
 */
export default function LanguageSwitcher({
  lang,
  className,
  iconClassName,
}: {
  lang: string;
  className?: string;
  iconClassName?: string;
}) {
  const { i18n } = useTranslation(lang);
  const [activeLang, setActiveLang] = useState(getClientLanguage());
  const [isChanging, setIsChanging] = useState(false);
  
  // Listen for language changes from other components
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      setActiveLang(event.detail.language);
    };
    
    window.addEventListener('i18n-language-changed', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('i18n-language-changed', handleLanguageChange as EventListener);
    };
  }, []);
  
  // Sync with client language on mount and when prop changes
  useEffect(() => {
    const clientLang = getClientLanguage();
    if (clientLang !== activeLang) {
      setActiveLang(clientLang);
    }
  }, [lang]);

  // Handle language button click
  const handleLanguageChange = (newLang: string) => {
    if (newLang === activeLang || isChanging) return;
    
    setIsChanging(true);
    
    try {
      // Use the global function to change language
      changeAppLanguage(newLang);
      
      // Update component state
      setActiveLang(newLang);
      
      // Force i18n instance to update
      i18n.changeLanguage(newLang);
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      // Always reset changing state
      setTimeout(() => setIsChanging(false), 100);
    }
  };

  return (
    <div className={cn("inline-flex gap-1.5 sm:gap-3", className)}>
      {languageOptions.map((option) => {
        const isActive = option.value === activeLang;
        return (
          <button
            key={option.id}
            onClick={() => handleLanguageChange(option.value)}
            className={cn(
              "inline-flex items-center px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-all",
              isActive 
                ? "bg-white dark:bg-primary dark:bg-opacity-90 shadow-md"
                : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
            )}
            disabled={isChanging}
          >
            <div className="flex items-center">
              <div className={cn(
                "w-4 h-3 sm:w-5 sm:h-3.5 mr-1.5 sm:mr-2.5 overflow-hidden flex items-center justify-center",
                iconClassName
              )}>
                {option.icon}
              </div>
              <span className={cn(
                "text-xs sm:text-sm", 
                isActive 
                  ? "text-gray-900 dark:text-white font-medium" 
                  : "text-gray-600 dark:text-gray-300"
              )}>
                {option.name}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
