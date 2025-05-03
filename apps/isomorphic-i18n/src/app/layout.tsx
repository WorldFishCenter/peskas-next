import { siteConfig } from "@/config/site.config";
import { inter, lexendDeca } from "@/app/fonts";
import cn from "@utils/class-names";
import ModalSwitcher from "@/app/_components/modal/modal-switcher";
import { TRPCReactProvider } from "@/trpc/react";

import "./[lang]/globals.css";

export const metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
