'use client';

import { default as NextLink } from 'next/link';
import { ReactNode, forwardRef, ComponentProps } from 'react';
import { getDocumentLanguage, fixUrlLanguage } from './utils';

type LinkProps = ComponentProps<typeof NextLink> & {
  children: ReactNode;
  lang?: string;
};

/**
 * A wrapper around Next.js Link component that ensures language prefixes are preserved
 */
const LanguageLink = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, lang, children, ...props }, ref) => {
    // Determine the active language
    const activeLang = lang || (typeof window !== 'undefined' ? getDocumentLanguage() : 'en');
    
    // Convert the href to a string 
    const rawHref = href.toString();
    
    // Only modify internal, relative links
    let processedHref = rawHref;
    
    // Skip external and special links
    if (!rawHref.startsWith('http') && 
        !rawHref.startsWith('#') && 
        !rawHref.startsWith('tel:') && 
        !rawHref.startsWith('mailto:') &&
        !rawHref.startsWith('/_next')) {
      // Apply language prefix to this href
      processedHref = fixUrlLanguage(rawHref, activeLang);
    }

    return (
      <NextLink ref={ref} href={processedHref} {...props}>
        {children}
      </NextLink>
    );
  }
);

LanguageLink.displayName = 'LanguageLink';

export default LanguageLink; 