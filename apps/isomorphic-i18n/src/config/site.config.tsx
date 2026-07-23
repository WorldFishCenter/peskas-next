import { Metadata } from 'next';
import logoImg from '@public/logo.svg';
import logoIconImg from '@public/logo-short.svg';
import { OpenGraph } from 'next/dist/lib/metadata/types/opengraph-types';
import sailboatIcon from '@public/sailboat-icon.svg';

enum MODE {
  LIGHT = 'light',
  DARK = 'dark',
}

export const siteConfig = {
  title: 'PESKAS | KENYA FISHERIES',
  description: 'Peskas | Kenya Fisheries Dashboard',
  logo: logoImg,
  icon: logoIconImg,
  mode: MODE.LIGHT,
  favicon: sailboatIcon,
  author: {
    name: 'WorldFish',
    url: 'https://www.worldfishcenter.org',
  },
  partners: [
    {
      name: 'WCS',
      fullName: 'Wildlife Conservation Society',
      url: 'https://www.wcs.org',
    },
  ],
  mainContributor: {
    name: 'Lorenzo Longobardi',
    role: 'Main Contributor',
  },
  headerLinks: [],
};

export const metaObject = (
  title?: string,
  openGraph?: OpenGraph,
  description: string = siteConfig.description
): Metadata => {
  return {
    title: title ? `${title} - Isomorphic Furyroad` : siteConfig.title,
    description,
    openGraph: openGraph ?? {
      title: title ? `${title} - Isomorphic Furyroad` : title,
      description,
      url: 'https://isomorphic-furyroad.vercel.app',
      siteName: 'Isomorphic Furyroad', // https://developers.google.com/search/docs/appearance/site-names
      images: {
        url: 'https://s3.amazonaws.com/redqteam.com/isomorphic-furyroad/itemdep/isobanner.png',
        width: 1200,
        height: 630,
      },
      locale: 'en_US',
      type: 'website',
    },
  };
};
