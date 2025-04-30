import { Title, Text } from 'rizzui';
import PageHeader from '@/app/shared/page-header';
import cn from '@utils/class-names';

const pageHeader = {
  title: 'Catch Composition',
  breadcrumb: [
    {
      href: '/',
      name: 'Home',
    },
    {
      name: 'Catch',
    },
  ],
};

function SectionBlock({
  title,
  children,
  className,
}: React.PropsWithChildren<{
  title: string;
  className?: string;
}>) {
  return (
    <section className={cn('mb-8 last:mb-0', className)}>
      <Title as="h3" className="mb-4 text-xl font-semibold lg:text-2xl">
        {title}
      </Title>
      {children}
    </section>
  );
}

export default function AboutPage({
  params: { lang },
}: {
  params: { lang?: string };
}) {
  return (
    <>
      <PageHeader title={pageHeader.title} breadcrumb={pageHeader.breadcrumb} />
      <div className="@container">
        <div className="mx-auto max-w-[1200px] space-y-10 py-6">
          <div className="prose mx-auto max-w-full dark:prose-invert lg:prose-lg">
            <Text className="mb-8 text-lg leading-loose text-gray-600 lg:text-xl">
              Work in progress...
            </Text>
          </div>
        </div>
      </div>
    </>
  );
} 