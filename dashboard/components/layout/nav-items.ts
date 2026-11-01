import {
  ArrowLeftRight,
  Beef,
  Calculator,
  HeartHandshake,
  LayoutDashboard,
  Settings,
  Syringe,
  Wallet,
  Wheat,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Inicio', icon: LayoutDashboard },
  { href: '/stock', label: 'Stock', icon: Beef },
  { href: '/movimientos', label: 'Movimientos y SIGSA', icon: ArrowLeftRight },
  { href: '/sanidad', label: 'Sanidad', icon: Syringe },
  { href: '/reproduccion', label: 'Reproducción', icon: HeartHandshake },
  { href: '/nutricion', label: 'Nutrición y forraje', icon: Wheat },
  { href: '/costos', label: 'Costos', icon: Calculator },
  { href: '/finanzas', label: 'Finanzas', icon: Wallet },
  { href: '/config', label: 'Configuración', icon: Settings },
];
