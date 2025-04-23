"use client";

import { SWFlag } from "@components/icons/language/SWFlag";
import { USFlag } from "@components/icons/language/USFlag";
import cn from "@utils/class-names";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "./client";
import { setDocumentLanguage } from "./utils";

type LanguageOption = {
  id: string;
  name: string;
  value: string;
  icon: React.ReactNode;
};

const languageOptions: LanguageOption[] = [
  {
    id: "en",
    name: "EN",
    value: "en",
    icon: <USFlag />,
  },
  {
    id: "sw",
    name: "SW",
    value: "sw",
    icon: <SWFlag />,
  },
];

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
  const router = useRouter();
  const pathname = usePathname();

  function handleLanguageChange(langValue: string) {
    // Skip if already selected
    if (langValue === lang) return;
    
    // Change language in i18n context
    i18n.changeLanguage(langValue);
    
    // Store the language preference in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', langValue);
      localStorage.setItem('selectedLanguage', langValue);
      localStorage.setItem('peskas-language', langValue);
      
      // Update the HTML lang attribute for immediate effect
      setDocumentLanguage(langValue);
    }
    
    // Update URL without causing a full page reload
    if (pathname && typeof window !== 'undefined') {
      const newPath = pathname.replace(/^\/(en|sw)/, `/${langValue}`);
      window.history.pushState(null, '', newPath);
      
      // Force a router refresh to ensure all components update
      setTimeout(() => {
        router.refresh();
      }, 0);
    }
  }

  return (
    <div className={cn("inline-flex gap-1.5 sm:gap-3", className)}>
      {languageOptions.map((option) => {
        const isActive = option.value === lang;
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
          >
            <div className="flex items-center">
              <div className="w-4 h-3 sm:w-5 sm:h-3.5 mr-1.5 sm:mr-2.5 overflow-hidden flex items-center justify-center">
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
