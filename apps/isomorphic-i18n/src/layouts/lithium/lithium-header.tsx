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
} from "react-icons/pi";
import { useTheme } from "next-themes";
import HeaderMenuLeft from "@/layouts/lithium/lithium-menu";
import Sidebar from "@/layouts/hydrogen/sidebar";
import StickyHeader from "@/layouts/sticky-header";
import LanguageSwitcher from "@/app/i18n/language-switcher";
import SearchWidget from "@/app/shared/search/search";
import { FilterSelector } from "@/app/components/filter-selector";
import { useSession } from "next-auth/react";
import type { TBmu } from "@repo/nosql/schema/bmu";
import LanguageLink from "@/app/i18n/language-link";
import useUserPermissions from "@/app/shared/file/dashboard/hooks/useUserPermissions";

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
    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 rounded-full">
      <PiMapPinDuotone className="h-4 w-4 text-gray-600" />
      <span className="font-medium text-gray-900">{userBmu}</span>
    </div>
  );
}

function HeaderMenuRight({ lang }: { lang?: string }) {
  return (
    <div className="ms-auto flex shrink-0 items-center gap-1 text-gray-700 xs:gap-2 md:gap-3 xl:gap-4">
      <ReferenceBMU />
      <FilterSelector />
      <ThemeToggle />
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
          <LanguageSwitcher
            lang={lang!}
            className="me-2 sm:me-3 rounded-none shadow-none"
          />
          {/*
          <SearchWidget
            icon={<PiMagnifyingGlassDuotone className="h-[20px] w-[20px]" />}
            className={cn(
              "text-gray-700 hover:text-gray-900 focus-visible:outline-0 active:translate-y-0 xl:border-0 xl:p-0 xl:shadow-none xl:backdrop-blur-none xl:hover:border-0 xl:hover:outline-0 xl:focus:outline-0 xl:focus-visible:outline-0 [&_.magnifying-glass]:me-0 [&_.placeholder-text]:hidden [&_.search-command]:ms-2 [&_.search-command]:hidden [&_.search-command]:lg:text-gray-0"
            )}
          />
          */}
        </div>
        <HeaderMenuRight lang={lang} />
      </div>
    </StickyHeader>
  );
}
