import { Title, Text } from 'rizzui';
import PageHeader from '@/app/shared/page-header';
import cn from '@utils/class-names';

const pageHeader = {
  title: 'About Peskas Kenya',
  breadcrumb: [
    {
      href: '/',
      name: 'Home',
    },
    {
      name: 'About',
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
              Peskas is an innovative digital monitoring system designed to transform data into actionable insights for Kenya&apos;s small-scale fisheries. Operating at the intersection of technology and community-driven resource management, Peskas serves as a bridge between traditional fishing practices and sustainable marine resource management.
            </Text>

            <SectionBlock title="Our Purpose">
              <Text className="text-gray-600">
                The platform aims to enhance decision-making in coastal communities by providing transparent, accessible fisheries data. Through careful monitoring and analysis, Peskas helps balance ecological sustainability with the economic needs of fishing communities.
              </Text>
            </SectionBlock>

            <SectionBlock title="Data and Insights">
              <div className="space-y-6">
                <div>
                  <Title as="h4" className="mb-2 text-lg font-medium">
                    Catch Monitoring
                  </Title>
                  <Text className="text-gray-600">
                    Comprehensive data collection on fish species, catch volumes, and fishing locations provides a clear picture of fishing activities along Kenya&apos;s coast. This information helps track changes in fish populations and identify sustainable harvest levels.
                  </Text>
                </div>

                <div>
                  <Title as="h4" className="mb-2 text-lg font-medium">
                    Economic Analysis
                  </Title>
                  <Text className="text-gray-600">
                    The system captures and analyzes economic data, including:
                  </Text>
                  <ul className="mt-2 list-inside list-disc text-gray-600">
                    <li>Revenue from fishing activities</li>
                    <li>Operational costs</li>
                    <li>Market trends and pricing</li>
                    <li>Economic performance indicators</li>
                  </ul>
                </div>

                <div>
                  <Title as="h4" className="mb-2 text-lg font-medium">
                    Community-Level Assessment
                  </Title>
                  <Text className="text-gray-600">
                    Peskas aggregates data at the community level, enabling Beach Management Units (BMUs) to:
                  </Text>
                  <ul className="mt-2 list-inside list-disc text-gray-600">
                    <li>Track overall fishery performance</li>
                    <li>Monitor community-wide fishing patterns</li>
                    <li>Assess the effectiveness of management strategies</li>
                    <li>Compare performance with neighboring communities</li>
                  </ul>
                </div>

                <div>
                  <Title as="h4" className="mb-2 text-lg font-medium">
                    Sustainability Metrics
                  </Title>
                  <Text className="text-gray-600">
                    The platform incorporates sustainability indicators that help communities understand:
                  </Text>
                  <ul className="mt-2 list-inside list-disc text-gray-600">
                    <li>Current catch levels relative to sustainable thresholds</li>
                    <li>Long-term trends in fish populations</li>
                    <li>Ecosystem health indicators</li>
                    <li>Impact of various fishing practices</li>
                  </ul>
                </div>
              </div>
            </SectionBlock>

            <SectionBlock title="Implementation Approach">
              <Text className="text-gray-600">
                Peskas operates through a carefully structured system of Beach Management Units across Kenya&apos;s coastal regions. Each BMU receives specific levels of information access, allowing for individual fisher and trader data access, community-level performance metrics, regional comparison capabilities, and sustainable fishing threshold monitoring.
              </Text>
            </SectionBlock>

            <SectionBlock title="Knowledge Framework">
              <Text className="text-gray-600">
                The system is built on a Knowledge, Attitude, and Practices (KAP) framework, which structures information delivery to maximize its impact on behavior change and decision-making. This approach ensures that data is not just collected but transformed into practical knowledge that can influence fishing practices and resource management decisions.
              </Text>
            </SectionBlock>

            <SectionBlock title="Long-Term Vision">
              <Text className="text-gray-600">
                Peskas is committed to supporting the sustainable development of Kenya&apos;s small-scale fisheries by:
              </Text>
              <ul className="mt-2 list-inside list-disc text-gray-600">
                <li>Promoting evidence-based decision-making</li>
                <li>Supporting the economic viability of fishing communities</li>
                <li>Protecting marine ecosystems</li>
                <li>Enhancing transparency in fisheries management</li>
                <li>Building capacity for data-driven resource stewardship</li>
              </ul>
              <Text className="mt-4 text-gray-600">
                Through this comprehensive approach, Peskas works to ensure that Kenya&apos;s marine resources continue to support coastal livelihoods while maintaining ecological balance for future generations.
              </Text>
            </SectionBlock>
          </div>
        </div>
      </div>
    </>
  );
} 