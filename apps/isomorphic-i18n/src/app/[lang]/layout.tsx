import dynamic from "next/dynamic";
import { Toaster } from "react-hot-toast";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import AuthProvider from "@/app/api/auth/[...nextauth]/auth-provider";
import GlobalDrawer from "@/app/shared/drawer-views/container";
import GlobalModal from "@/app/shared/modal-views/container";
import { ThemeProvider } from "@/app/shared/theme-provider";
import { siteConfig } from "@/config/site.config";
import { inter, lexendDeca } from "@/app/fonts";
import cn from "@utils/class-names";
import { dir } from "i18next";
import { languages } from "../i18n/settings";
import { GlobalFilterProvider } from "../components/global-filter-provider";
import { TRPCReactProvider } from "@/trpc/react";
import LanguageInitializer from "../i18n/language-initializer";
import Script from "next/script";

const NextProgress = dynamic(() => import("@components/next-progress"), {
  ssr: false,
});

export const metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
};

export async function generateStaticParams() {
  return languages.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params: { lang },
}: {
  children: React.ReactNode;
  params: any;
}) {
  const session = await getServerSession(authOptions);
  return (
    <html lang={lang} dir={dir(lang)} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(inter.variable, lexendDeca.variable, "font-inter")}
      >
        <GlobalFilterProvider>
          <TRPCReactProvider>
            <AuthProvider session={session}>
              <ThemeProvider>
                <NextProgress />
                <LanguageInitializer lang={lang} />
                {children}
                <Toaster />
                <GlobalDrawer />
                <GlobalModal />
              </ThemeProvider>
            </AuthProvider>
          </TRPCReactProvider>
        </GlobalFilterProvider>
      </body>
    </html>
  );
}
