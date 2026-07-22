/**
 * PM-41B — Iconografía Lucide del Enterprise Sidebar.
 * Sin emojis / unicode decorativos.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BarChart3,
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  HelpCircle,
  Home,
  LayoutDashboard,
  Link2,
  MapPin,
  Package,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Star,
  Trees,
  User,
  Users,
  Workflow,
} from 'lucide-react';

const NAV_ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  'layout-dashboard': LayoutDashboard,
  'shopping-cart': ShoppingCart,
  'clipboard-check': ClipboardCheck,
  package: Package,
  boxes: Boxes,
  'file-text': FileText,
  workflow: Workflow,
  user: User,
  users: Users,
  trees: Trees,
  'map-pin': MapPin,
  'bar-chart-3': BarChart3,
  'clipboard-list': ClipboardList,
  search: Search,
  activity: Activity,
  'building-2': Building2,
  shield: Shield,
  settings: Settings,
  'help-circle': HelpCircle,
  'folder-open': FolderOpen,
  link: Link2,
  star: Star,
  operation: ShoppingCart,
  gestion: Users,
  reports: BarChart3,
  configuration: Settings,
  help: HelpCircle,
  favorites: Star,
};

export const SidebarChromeIcons = {
  search: Search,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  panelClose: PanelLeftClose,
  panelOpen: PanelLeftOpen,
  star: Star,
  home: Home,
  menu: Menu,
} as const;

export function resolveNavIcon(iconKey: string | undefined): LucideIcon {
  if (!iconKey) return FolderOpen;
  return NAV_ICON_MAP[iconKey] ?? FolderOpen;
}

export function NavIcon({
  name,
  size = 18,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = resolveNavIcon(name);
  return <Icon size={size} strokeWidth={1.75} className={className} aria-hidden />;
}
