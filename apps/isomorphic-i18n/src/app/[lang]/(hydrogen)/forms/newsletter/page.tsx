// Newsletter components removed - not needed for fisheries data dashboard
import PageHeader from '@/app/shared/page-header';
import { routes } from '@/config/routes';
import { metaObject } from '@/config/site.config';

export const metadata = {
  ...metaObject('Newsletter'),
};

const pageHeader = {
  title: 'text-newsletter',
  breadcrumb: [
    {
      href: routes.eCommerce.dashboard,
      name: 'text-home',
    },
    {
      name: 'text-newsletter',
    },
  ],
};

export default function NewsletterFormPage({
  params: { lang },
}: {
  params: {
    lang: string;
  };
}) {
  return (
    <>
      <PageHeader title={pageHeader.title} breadcrumb={pageHeader.breadcrumb} />
      <div className="grid grid-cols-1 gap-6 @container">
        <div className="rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Newsletter Components Removed</h3>
          <p className="text-gray-600 mb-4">
            Newsletter components have been removed as they are not relevant to the fisheries data dashboard.
            This page is kept for navigation compatibility.
          </p>
          <p className="text-sm text-gray-500">
            If you need newsletter functionality for the fisheries dashboard, please implement domain-specific components.
          </p>
        </div>
      </div>
    </>
  );
}
