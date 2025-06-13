"use client";

import Link from "next/link";
import { Badge, ActionIcon, Text } from "rizzui";
import cn from "@utils/class-names";
import MessagesDropdown from "@/layouts/messages-dropdown";
import NotificationDropdown from "@/layouts/notification-dropdown";
import ProfileMenu from "@/layouts/profile-menu";
import SettingsButton from "@/layouts/settings-button";
import HamburgerButton from "@/layouts/hamburger-button";
import Logo from "@components/logo";
import KenyaFlag from "@components/icons/kenya-flag";
import {
  PiBellSimpleRingingDuotone,
  PiChatsCircleDuotone,
  PiGearDuotone,
  PiMagnifyingGlassDuotone,
  PiSun,
  PiMoon,
  PiMapPinDuotone,
  PiCaretDownBold,
} from "react-icons/pi";
import { useTheme } from "next-themes";
import HeaderMenuLeft from "@/layouts/lithium/lithium-menu";
import Sidebar from "@/layouts/hydrogen/sidebar";
import StickyHeader from "@/layouts/sticky-header";
import { FilterSelector, selectedMetricAtom } from "@/app/components/filter-selector";
import { useSession } from "next-auth/react";
import type { TBmu } from "@repo/nosql/schema/bmu";
import LanguageLink, { getClientLanguage } from "@/app/i18n/language-link";
import useUserPermissions from "@/app/shared/file/dashboard/hooks/useUserPermissions";
import { useAtom } from 'jotai';
import { METRIC_OPTIONS } from '@/app/shared/file/dashboard/charts/types';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { changeAppLanguage } from '@/app/i18n/language-switcher';
import { USFlag } from "@components/icons/language/USFlag";
import { SWFlag } from "@components/icons/language/SWFlag";
import { useTranslation } from "@/app/i18n/client";

type SerializedBmu = {
  _id: string;
  BMU: string;
  group: string;
}

type CustomSession = {
  user?: {
    bmus?: Omit<TBmu, "lat" | "lng" | "treatments">[];
    userBmu?: SerializedBmu;
  }
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <ActionIcon
      aria-label="Toggle theme"
      variant="text"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={cn(
        "h-[34px] w-[34px] shadow backdrop-blur-md dark:bg-gray-100 md:h-9 md:w-9",
        "relative rounded-full text-gray-700 hover:text-gray-1000"
      )}
    >
      {theme === "dark" ? (
        <PiSun className="h-[22px] w-auto" />
      ) : (
        <PiMoon className="h-[22px] w-auto" />
      )}
    </ActionIcon>
  );
}

function ReferenceBMU() {
  const { data: session } = useSession() as { data: CustomSession | null };
  const userBmu = session?.user?.userBmu?.BMU;

  if (!userBmu) return null;

  return (
    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 rounded-full">
      <PiMapPinDuotone className="h-4 w-4 text-gray-600" />
      <span className="font-medium text-gray-900">{userBmu}</span>
    </div>
  );
}

// Compact Language Switcher
function CompactLanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState(() => getClientLanguage());
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const handleLanguageChange = (event: CustomEvent) => {
      setCurrentLang(event.detail.language);
    };
    
    window.addEventListener('i18n-language-changed', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('i18n-language-changed', handleLanguageChange as EventListener);
    };
  }, []);

  const handleLanguageChange = (newLang: string) => {
    if (newLang === currentLang) return;
    
    changeAppLanguage(newLang);
    setCurrentLang(newLang);
    setIsOpen(false);
  };

  if (!mounted) return null;

  const languages = [
    { code: 'en', name: 'EN', icon: <USFlag className="w-4 h-3" /> },
    { code: 'sw', name: 'SW', icon: <SWFlag className="w-4 h-3" /> }
  ];

  const currentLanguage = languages.find(lang => lang.code === currentLang) || languages[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors",
          "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        )}
      >
        <span className="w-4 h-3 overflow-hidden flex items-center justify-center">
          {currentLanguage.icon}
        </span>
        <span className="hidden sm:inline">{currentLanguage.name}</span>
        <PiCaretDownBold className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[1000]" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 z-[1001] min-w-[100px]">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors first:rounded-t-md last:rounded-b-md",
                  currentLang === lang.code
                    ? "bg-blue-50 dark:bg-blue-800 text-blue-900 dark:text-blue-200"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <span className="w-4 h-3 overflow-hidden flex items-center justify-center">
                  {lang.icon}
                </span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HeaderMenuRight({ lang }: { lang?: string }) {
  const pathname = usePathname();
  const [selectedMetric, setSelectedMetric] = useAtom(selectedMetricAtom);
  const [isMetricOpen, setIsMetricOpen] = useState(false);
  const { t } = useTranslation(lang || 'en');
  
  const selectedMetricOption = METRIC_OPTIONS.find(
    (m) => m.value === selectedMetric
  );

  // Header-optimized metric selector
  const HeaderMetricSelector = () => {
    const groupedMetrics = {
      catch: METRIC_OPTIONS.filter((m) => m.category === "catch"),
      revenue: METRIC_OPTIONS.filter((m) => m.category === "revenue"),
    };

    const getDisplayLabel = (option: any) => {
      switch(option.value) {
        case 'mean_effort': return t('text-metrics-effort');
        case 'mean_cpue': return t('text-metrics-catch-rate');
        case 'mean_cpua': return t('text-metrics-catch-density');
        case 'mean_rpue': return t('text-metrics-fisher-revenue');
        case 'mean_rpua': return t('text-metrics-area-revenue');
        default: return option.label;
      }
    };

    const getUnitDisplay = (unit: string) => {
      // Keep units as they are since they're technical/standard units
      return unit;
    };

    return (
      <div className="relative">
        <button
          onClick={() => setIsMetricOpen(!isMetricOpen)}
          className={cn(
            "flex items-center gap-2 px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors",
            "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700",
            selectedMetric === "mean_rpue" || selectedMetric === "mean_rpua"
              ? "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50"
              : "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50"
          )}
        >
          <span className="truncate">
            {selectedMetricOption ? getDisplayLabel(selectedMetricOption) : t('text-metrics-catch')}
          </span>
          <PiCaretDownBold className={cn("h-3 w-3 transition-transform flex-shrink-0", isMetricOpen && "rotate-180")} />
        </button>

        {isMetricOpen && (
          <>
            <div 
              className="fixed inset-0 z-[1000]" 
              onClick={() => setIsMetricOpen(false)}
            />
            <div className="absolute left-1/2 sm:left-auto sm:right-0 top-full mt-1 w-80 sm:w-64 -translate-x-1/2 sm:translate-x-0 bg-white dark:bg-gray-900 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 z-[1001] max-h-96 overflow-y-auto">
              <div className="p-2">
                {/* Catch Metrics */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 px-2 py-1 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-200">{t('text-metrics-catch')}</span>
                  </div>
                  <div className="space-y-0.5">
                    {groupedMetrics.catch.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedMetric(option.value);
                          setIsMetricOpen(false);
                        }}
                        className={cn(
                          "w-full px-2 py-1.5 text-left text-sm rounded transition-colors",
                          "flex flex-col items-start gap-0.5",
                          selectedMetric === option.value
                            ? "bg-blue-50 dark:bg-blue-800 text-blue-900 dark:text-blue-200"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                      >
                        <span className="font-medium">{getDisplayLabel(option)}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {getUnitDisplay(option.unit)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Revenue Metrics */}
                <div>
                  <div className="flex items-center gap-2 px-2 py-1 mb-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-200">{t('text-metrics-revenue')}</span>
                  </div>
                  <div className="space-y-0.5">
                    {groupedMetrics.revenue.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedMetric(option.value);
                          setIsMetricOpen(false);
                        }}
                        className={cn(
                          "w-full px-2 py-1.5 text-left text-sm rounded transition-colors",
                          "flex flex-col items-start gap-0.5",
                          selectedMetric === option.value
                            ? "bg-amber-50 dark:bg-amber-800 text-amber-900 dark:text-amber-200"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                      >
                        <span className="font-medium">{getDisplayLabel(option)}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {getUnitDisplay(option.unit)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="ms-auto flex shrink-0 items-center gap-1 text-gray-700 xs:gap-1 md:gap-2 xl:gap-3">
      {/* <ReferenceBMU /> */}
      <HeaderMetricSelector />
      <div className="hidden sm:block">
        <FilterSelector />
      </div>
      <CompactLanguageSwitcher />
      {/* <ThemeToggle /> */}
      <ProfileMenu
        buttonClassName="w-auto sm:w-auto p-1 border border-gray-300"
        avatarClassName="!w-7 !h-7 sm:!h-8 sm:!w-8"
        lang={lang}
      />
    </div>
  );
}

export default function Header({ lang }: { lang?: string }) {
  return (
    <StickyHeader
      className={"z-[990] justify-between 2xl:py-5 2xl:pl-6 3xl:px-8"}
    >
      <div className="hidden items-center gap-3 xl:flex">
        <LanguageLink
          aria-label="Site Logo"
          href="/"
          className="me-4 hidden w-[155px] shrink-0 text-gray-800 hover:text-gray-900 lg:me-5 xl:block"
        >
          <div className="flex items-center gap-2">
            <Logo className="max-w-[155px]" />
            <KenyaFlag className="h-6 w-auto" />
          </div>
        </LanguageLink>
        <HeaderMenuLeft lang={lang} />
      </div>
      <div className="flex w-full items-center gap-2 sm:gap-3 md:gap-5 xl:w-auto 3xl:gap-6">
        <div className="flex w-full max-w-2xl items-center xl:w-auto">
          <HamburgerButton
            view={<Sidebar className="static w-full 2xl:w-full" lang={lang} />}
            customSize="90%"
          />
          <LanguageLink
            aria-label="Site Logo"
            href="/"
            className="me-2 w-8 sm:me-3 sm:w-9 shrink-0 text-gray-800 hover:text-gray-900 lg:me-5 xl:hidden"
          >
            <Logo iconOnly={true} />
          </LanguageLink>
          {/* Mobile filter selector */}
          <div className="sm:hidden">
            <FilterSelector />
          </div>
        </div>
        <HeaderMenuRight lang={lang} />
      </div>
    </StickyHeader>
  );
}
