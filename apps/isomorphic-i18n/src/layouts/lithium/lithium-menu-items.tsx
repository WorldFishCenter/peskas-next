import { routes } from '@/config/routes';
import { DUMMY_ID } from '@/config/constants';

export type SubMenuItemType = {
  name: string;
  href: string;
};

export type DropdownItemType = {
  name: string;
  icon: string;
  description?: string;
  href?: string;
  subMenuItems?: SubMenuItemType[];
};

export type LithiumMenuItem = {
  [key: string]: {
    name: string;
    type: string;
    dropdownItems: DropdownItemType[];
  };
};

export const lithiumMenuItems: LithiumMenuItem = {
  about: {
    name: 'About',
    type: 'link',
    dropdownItems: [
      {
        name: 'About',
        href: '/about',
        icon: 'InfoIcon',
      },
    ],
  },
  catch_composition: {
    name: 'Catch Composition',
    type: 'link',
    dropdownItems: [
      {
        name: 'Catch Composition',
        href: routes.catch_composition,
        icon: 'FishIcon',
      },
    ],
  },
};

export type LithiumMenuItemsKeys = keyof typeof lithiumMenuItems;
