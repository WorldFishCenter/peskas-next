import { routes } from '@/config/routes';
import { DUMMY_ID } from '@/config/constants';
import {
  PiFishDuotone,
  PiInfoDuotone,
  PiHouseLineDuotone
} from 'react-icons/pi';

// Note: do not add href in the label object, it is rendering as label
export const menuItems = [
  // Home
  {
    name: 'Home',
    href: '/',
    icon: <PiHouseLineDuotone />,
  },
  // Catch Composition
  {
    name: 'Catch Composition',
    href: routes.catch_composition,
    icon: <PiFishDuotone />,
  },
  // About page
  {
    name: 'About',
    href: routes.about,
    icon: <PiInfoDuotone />,
  },
];
