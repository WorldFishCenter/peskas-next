import PageHeader from "@/app/shared/page-header";
import AggregatedCatch from "@/app/shared/file/catch/aggregated-catch";

const pageHeader = {
  title: "Aggregated",
  breadcrumb: [
    {
      href: "/",
      name: "Home",
    },
    {
      name: "Aggregated catch",
    },
  ],
};

export default function NewPage({ lang }: { lang?: string }) {
  return (
    <div className="flex flex-col h-screen">
      <PageHeader title={pageHeader.title} breadcrumb={pageHeader.breadcrumb} />
      <div className="mb-6 grid grid-cols-1 gap-6 @4xl:grid-cols-12 2xl:mb-8 2xl:gap-8">
        <AggregatedCatch
          className="@container @4xl:col-span-8 @[96.937rem]:col-span-9"
          lang={lang}
        />
      </div>
    </div>
  );
}
