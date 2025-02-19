'use client';

import FileDashboard from '@/app/shared/file/dashboard';

export default function File({
  params: { lang },
}: {
  params: {
    lang: string;
  };
}) {
  return <FileDashboard lang={lang} />;
}
