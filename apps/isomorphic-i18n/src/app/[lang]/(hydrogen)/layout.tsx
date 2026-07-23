'use client';
import { useIsMounted } from '@hooks/use-is-mounted';
import LithiumLayout from '@/layouts/lithium/lithium-layout';

export default function DefaultLayout({
  children,
  params: { lang },
}: {
  children: React.ReactNode;
  params: {
    lang: string;
  };
}) {
  const isMounted = useIsMounted();

  if (!isMounted) {
    return null;
  }

  return <LithiumLayout lang={lang}>{children}</LithiumLayout>;
}
