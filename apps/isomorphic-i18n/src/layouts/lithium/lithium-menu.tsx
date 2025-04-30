"use client";

import Link from "next/link";
import { PiCaretDownBold } from "react-icons/pi";
import cn from "@utils/class-names";
import NavMenu from "@/layouts/nav-menu/nav-menu";
import { DropdownItemType, LithiumMenuItemsKeys, lithiumMenuItems } from "@/layouts/lithium/lithium-menu-items";
import { lithiumMenuIcons } from "@/layouts/lithium/lithium-menu-icons";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
import { useDirection } from "@hooks/use-direction";
import { NavMenuDirection } from "@/layouts/nav-menu/nav-menu-types";

/**
 * Menu trigger button for parent menus.
 * Dynamically shows the caret only for multi-item dropdowns.
 */
function MenuTriggerButton({
  name,
  lang,
  showCaret,
}: {
  name: LithiumMenuItemsKeys;
  lang?: string;
  showCaret?: boolean;
}) {
  const { t } = useTranslation(lang!, "nav");
  return (
    <>
      <span className="text-sm font-medium text-gray-900">
        {t(lithiumMenuItems[name].name)}
      </span>
      {showCaret && <PiCaretDownBold className="text-gray-600 ml-1" />}
    </>
  );
}

/**
 * Renders a list of dropdown items for multi-item menus.
 */
function LinkMenu({
  items,
  lang,
}: {
  items: DropdownItemType[];
  lang?: string;
}) {
  const pathname = usePathname();
  const { t } = useTranslation(lang!, "nav");

  return (
    <ul className="w-full bg-white dark:bg-gray-100">
      {items.map((item, index) => {
        const isActive = `/${lang}${item.href}` === pathname;
        const IconComponent = lithiumMenuIcons[item.icon as keyof typeof lithiumMenuIcons];

        return (
          <li key={`link-menu-${item.name}-${index}`} className="my-1">
            <Link
              href={`/${lang}${item.href}`}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-200",
                isActive ? "bg-gray-100 dark:bg-gray-200" : ""
              )}
            >
              {IconComponent && <IconComponent className="h-5 w-5 text-gray-600" />}
              <span>{t(item.name)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Main header menu component for rendering parent and child menus.
 */
export default function HeaderMenuLeft({ lang }: { lang?: string }) {
  const { direction } = useDirection();
  const menuKeys: LithiumMenuItemsKeys[] = ["catch_composition", "about"]; 

  return (
    <NavMenu
      dir={direction as NavMenuDirection}
      menuClassName="pb-5 top-3 gap-8 relative"
      menuContentClassName="mt-2 border border-gray-200 dark:border-gray-300"
    >
      {menuKeys.map((key) => {
        const menu = lithiumMenuItems[key];
        const { dropdownItems } = menu;
        const hasSingleItem = dropdownItems.length === 1;

        const IconComponent =
          dropdownItems[0]?.icon &&
          (lithiumMenuIcons[dropdownItems[0].icon as keyof typeof lithiumMenuIcons] as React.ComponentType<{ className?: string }>);

        if (hasSingleItem) {
          // Render single-item menus like "Map"
          const itemHref = `/${lang}${dropdownItems[0].href}`;
          return (
            <NavMenu.Item key={key}>
              <NavMenu.Trigger>
                <Link
                  href={itemHref}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-200"
                >
                  {IconComponent && <IconComponent className="h-5 w-5 text-gray-600" />}
                  <MenuTriggerButton name={key} lang={lang} showCaret={false} />
                </Link>
              </NavMenu.Trigger>
            </NavMenu.Item>
          );
        }

        // Render multi-item dropdown menus like "Groups"
        return (
          <NavMenu.Item key={key}>
            <NavMenu.Trigger className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-200">
              <MenuTriggerButton name={key} lang={lang} showCaret />
            </NavMenu.Trigger>
            <NavMenu.Content>
              <div className="w-64 p-3 bg-white dark:bg-gray-100 rounded-md shadow-md">
                <LinkMenu items={dropdownItems} lang={lang} />
              </div>
            </NavMenu.Content>
          </NavMenu.Item>
        );
      })}
    </NavMenu>
  );
}
