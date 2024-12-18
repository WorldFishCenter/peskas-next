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
  catch: {
    name: 'sidebar-menu-overview',
    type: 'link',
    dropdownItems: [
      {
        name: 'Aggregated',
        href: routes.catch.aggregated,
        icon: 'FishIcon',
      },
      {
        name: 'Composition',
        href: routes.catch.composition,
        icon: 'PieIcon',
      },
    ],
  },
  map: {
    name: 'sidebar-map',
    type: 'link',
    dropdownItems: [
      {
        name: 'Map',
        href: routes.map,
        icon: 'MapIcon',
      },
    ],
  },
  widgets: {
    name: 'sidebar-menu-widgets',
    type: 'link',
    dropdownItems: [
      {
        name: 'sidebar-menu-cards',
        href: routes.widgets.cards,
        icon: 'DicesIcon',
      },
      {
        name: 'sidebar-menu-charts',
        href: routes.widgets.charts,
        icon: 'PieChartCurrencyIcon',
      },
      {
        name: 'sidebar-menu-charts',
        href: routes.forms.personalInformation,
        icon: 'PieChartCurrencyIcon',
      },
    ],
  },
  forms: {
    name: 'sidebar-menu-forms',
    type: 'link',
    dropdownItems: [
      {
        name: 'sidebar-menu-account-settings',
        href: routes.forms.profileSettings,
        icon: 'UserSettingsIcon',
      },
      {
        name: 'sidebar-menu-notification-preference',
        href: routes.forms.notificationPreference,
        icon: 'NotificationSettingsIcon',
      },
      {
        name: 'sidebar-menu-personal-information',
        href: routes.forms.personalInformation,
        icon: 'UserInfoIcon',
      },
      {
        name: 'sidebar-menu-newsletter',
        href: routes.forms.newsletter,
        icon: 'NewsletterAnnouncement',
      },
    ],
  },
  groups: {
    name: 'sidebar-menu-groups',
    type: 'link',
    dropdownItems: [
      {
        name: 'Control',
        href: routes.groups.control,
        icon: 'PageBlankIcon',
      },
      {
        name: 'IIA',
        href: routes.groups.iia,
        icon: 'PageBlankIcon',
      },
      {
        name: 'CIA',
        href: routes.groups.cia,
        icon: 'PageBlankIcon',
      },
      {
        name: 'WBCIA',
        href: routes.groups.wbcia,
        icon: 'PageBlankIcon',
      },
      {
        name: 'AIA',
        href: routes.groups.aia,
        icon: 'PageBlankIcon',
      },      
    ],
  },  
};

export type LithiumMenuItemsKeys = keyof typeof lithiumMenuItems;
