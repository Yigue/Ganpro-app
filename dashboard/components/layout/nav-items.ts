import {
  ArrowLeftRight,
  Beef,
  Calculator,
  HeartHandshake,
  LayoutDashboard,
  LineChart,
  MapPin,
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
  { href: '/gestion', label: 'Gestión integrada', icon: ArrowLeftRight },
  { href: '/mapa', label: 'Mapa de potreros', icon: MapPin },
  { href: '/stock', label: 'Stock', icon: Beef },
  { href: '/movimientos', label: 'Movimientos y SIGSA', icon: ArrowLeftRight },
  { href: '/sanidad', label: 'Sanidad', icon: Syringe },
  { href: '/reproduccion', label: 'Reproducción', icon: HeartHandshake },
  { href: '/nutricion', label: 'Nutrición y forraje', icon: Wheat },
  { href: '/costos', label: 'Costos', icon: Calculator },
  { href: '/finanzas', label: 'Finanzas', icon: Wallet },
  { href: '/proyeccion', label: 'Proyección', icon: LineChart },
  { href: '/config', label: 'Configuración', icon: Settings },
];

export const NAV_GROUPS=[
 {label:'General',items:NAV_ITEMS.slice(0,2)},
 {label:'Campo y existencias',items:NAV_ITEMS.slice(2,5)},
 {label:'Producción y sanidad',items:NAV_ITEMS.slice(5,8)},
 {label:'Economía y planificación',items:NAV_ITEMS.slice(8,11)},
 {label:'Administración',items:NAV_ITEMS.slice(11)},
];
