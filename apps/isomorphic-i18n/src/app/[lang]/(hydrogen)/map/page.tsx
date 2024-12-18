import PageHeader from "@/app/shared/page-header";
import DeckGL from "@/app/shared/file/dashboard/deck-map";

const pageHeader = {
  title: "Interactive map",
  breadcrumb: [
    {
      href: "/",
      name: "Home",
    },
  ],
};

export default function NewPage({
  params: { lang },
}: {
  params: { lang?: string };
}) {
  return (
    <div className="flex flex-col h-screen">
      <PageHeader title={pageHeader.title} breadcrumb={pageHeader.breadcrumb} />
      <div className="mb-6 2xl:mb-8">
        <div className="h-[500px] w-full relative @4xl:col-span-12 @[96.937rem]:col-span-12">
          <DeckGL />
        </div>
      </div>
    </div>
  );
}
