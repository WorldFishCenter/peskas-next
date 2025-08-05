'use client'

import { routes } from "@/config/routes";
import { Button } from "rizzui";
import { metaObject } from "@/config/site.config";
import PageHeader from "@/app/shared/page-header";
// Chart widgets removed - replaced by analytics components
import { useTranslation } from "@/app/i18n/client";

// export const metadata = {
//   ...metaObject('Charts'),
// };

const pageHeader = {
  title: "text-charts",
  breadcrumb: [
    {
      href: routes.eCommerce.dashboard,
      name: "text-home",
    },
    {
      name: "text-widgets",
    },
    {
      name: "text-charts",
    },
  ],
};

export default function ChartsPage({
  params: { lang },
}: {
  params: {
    lang: string;
  };
}) {
  const { t } = useTranslation(lang!, "common");

  return (
    <>
      <PageHeader title={pageHeader.title} breadcrumb={pageHeader.breadcrumb}>
        <div className="mt-4 flex items-center gap-3 @lg:mt-0">
          <a
            target="_blank"
            href="https://recharts.org/en-US"
            rel="nofollow noopener noreferrer"
            className="inline-flex w-full @lg:w-auto"
          >
            <Button as="span" className="w-full @lg:w-auto">
              {t("text-learn-more")}
            </Button>
          </a>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 @container">
        <div className="rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">{t("text-analytics-charts")}</h3>
          <p className="text-gray-600 mb-4">
            {t("text-analytics-charts-description") || "Interactive charts and analytics are available in the main dashboard and analytics sections."}
          </p>
          <div className="flex gap-2">
            <a href="/">
              <Button variant="solid">
                {t("text-view-dashboard") || "View Dashboard"}
              </Button>
            </a>
            <a href="/catch_composition">
              <Button variant="outline">
                {t("text-view-analytics") || "View Analytics"}
              </Button>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
