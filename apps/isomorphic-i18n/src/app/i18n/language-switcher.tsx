"use client";

import { SWFlag } from "@components/icons/language/SWFlag";
import { USFlag } from "@components/icons/language/USFlag";
import { Listbox, Transition } from "@headlessui/react";
import cn from "@utils/class-names";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { PiCaretDownBold } from "react-icons/pi";
import { useTranslation } from "./client";
import { setDocumentLanguage, fixUrlLanguage } from "./utils";

type LanguageMenuProps = {
  id: string;
  name: string;
  value: string;
  icon: React.ReactNode;
};

const languageMenu: LanguageMenuProps[] = [
  {
    id: "en",
    name: "English - EN",
    value: "en",
    icon: <USFlag />,
  },
  {
    id: "sw",
    name: "Swahili - SW",
    value: "sw",
    icon: <SWFlag />,
  },
];

export default function LanguageSwitcher({
  lang,
  className,
  iconClassName,
  variant = "icon",
}: {
  lang: string;
  className?: string;
  iconClassName?: string;
  variant?: "text" | "icon";
}) {
  const { i18n, t } = useTranslation(lang);
  const router = useRouter();
  const pathname = usePathname();
  
  const options = languageMenu;
  const currentSelectedItem = lang
    ? options.find((o) => o.value === lang) ?? options[0]
    : options[0];
  const [selectedItem, setSelectedItem] = useState(currentSelectedItem);

  function handleItemClick(values: any) {
    setSelectedItem(values);
    
    // Change language in i18n context
    i18n.changeLanguage(values.value);
    
    // Store the language preference in localStorage - this is the key part
    if (typeof window !== 'undefined') {
      localStorage.setItem('i18nextLng', values.value);
      localStorage.setItem('selectedLanguage', values.value);
      
      // Update the HTML lang attribute for immediate effect
      document.documentElement.lang = values.value;
    }
    
    // Update URL without causing a full page reload
    if (pathname && typeof window !== 'undefined') {
      const newPath = pathname.replace(/^\/(en|sw)/, `/${values.value}`);
      window.history.pushState(null, '', newPath);
    }
  }

  return (
    <>
      <Listbox value={selectedItem} onChange={handleItemClick}>
        {({ open }) => (
          <div className="relative z-10">
            <Listbox.Button
              className={cn(
                "relative flex h-[34px] w-14 items-center justify-center p-1 shadow backdrop-blur-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30 focus-visible:ring-opacity-50 hover:enabled:text-gray-1000 active:enabled:translate-y-px bg-gray-100 rounded-full",
                className
              )}
            >
              {variant === "text" ? (
                <span className="block w-full truncate text-center uppercase rtl:text-right font-medium">
                  {t(selectedItem?.value)}
                </span>
              ) : (
                <div className="flex items-center justify-center gap-2 uppercase">
                  <span
                    className={cn(
                      "h-4 w-5 shrink-0 overflow-hidden",
                      iconClassName
                    )}
                  >
                    {selectedItem?.icon}
                  </span>
                  <PiCaretDownBold className="size-3.5" />
                </div>
              )}
            </Listbox.Button>
            <Transition
              show={open}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute end-0 z-40 mt-1 max-h-[260px] w-full min-w-[165px] max-w-[165px] overflow-auto rounded-md border border-gray-100 bg-gray-0 p-2 outline-none ring-0 drop-shadow-lg focus:outline-none dark:bg-gray-100">
                {options?.map((option) => (
                  <Listbox.Option
                    key={option.id}
                    className={({ active }) =>
                      `${active ? "text-brand-dark bg-gray-100" : "bg-brand-light"}
												peer relative flex h-10 w-full cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm leading-[40px] text-gray-900 transition duration-200 dark:hover:bg-gray-50`
                    }
                    value={option}
                  >
                    {({ selected, active }) => (
                      <span className="flex items-center">
                        <span className="h-4 w-[22px]">{option?.icon}</span>
                        <span
                          className={`${
                            selected ? "font-medium " : "font-normal"
                          } block truncate pb-0.5 text-sm ltr:ml-1.5 rtl:mr-1.5`}
                        >
                          {t(option?.name)}
                        </span>
                        {selected ? (
                          <span
                            className={`${active && "text-amber-600"}
                                 absolute inset-y-0 flex items-center ltr:left-0 ltr:pl-3 rtl:right-0 rtl:pr-3`}
                          />
                        ) : null}
                      </span>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        )}
      </Listbox>
    </>
  );
}
