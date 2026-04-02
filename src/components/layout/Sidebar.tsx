'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  ChefHat,
  DollarSign,
  History,
  LogOut,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Trash2,
  Truck,
  User,
  Users,
  X,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function Sidebar({ className, activeTab, onTabChange, isOpen, onClose, onLogout }: SidebarProps) {
  const { t, language } = useLanguage();

  const menuItems = [
    { id: 'statistics', label: t.admin.statistics, icon: BarChart3, badge: null },
    { id: 'orders', label: t.admin.orders, icon: ShoppingCart, badge: 0 },
    { id: 'clients', label: t.admin.clients, icon: Users, badge: null },
    { id: 'admins', label: t.admin.admins, icon: Users, badge: null },
    { id: 'couriers', label: t.admin.couriers, icon: Truck, badge: null },
    { id: 'divider-1', type: 'divider' as const },
    { id: 'warehouse', label: t.warehouse.title, icon: Package, badge: null },
    { id: 'cooking', label: t.warehouse.cooking, icon: ChefHat, badge: null },
    { id: 'divider-2', type: 'divider' as const },
    { id: 'finance', label: t.finance.title, icon: DollarSign, badge: null },
    { id: 'history', label: t.admin.history, icon: History, badge: null },
    { id: 'divider-3', type: 'divider' as const },
    { id: 'chat', label: t.courier.chat, icon: MessageSquare, badge: null },
    { id: 'bin', label: t.admin.bin, icon: Trash2, badge: null },
    { id: 'divider-4', type: 'divider' as const },
    { id: 'profile', label: t.common.profile, icon: User, badge: null },
    { id: 'settings', label: t.admin.settings, icon: Settings, badge: null },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 lg:hidden transition-opacity duration-200"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          /* Base: off-screen left */
          'fixed inset-y-0 left-0 z-50 w-[264px] -translate-x-full',
          'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',

          /* Mobile: full-height panel */
          'border-r border-border bg-sidebar',

          /* Desktop: inline, not fixed */
          'lg:static lg:translate-x-0 lg:w-[248px] lg:shrink-0',
          'lg:border-r lg:border-border lg:bg-sidebar',

          /* Open state */
          isOpen && 'translate-x-0',

          className,
        )}
      >
        <div className="flex h-full flex-col">
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-sm)] dark:bg-main dark:text-main-foreground">
                <ChefHat className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-[15px] font-bold tracking-tight text-foreground">AutoFood</p>
                <p className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                  {language === 'ru' ? 'Панель' : language === 'uz' ? 'Panel' : 'Dashboard'}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden text-muted-foreground"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* ── Divider ── */}
          <div className="mx-4 h-px bg-border" />

          {/* ── Navigation ── */}
          <ScrollArea className="flex-1 py-3">
            <nav className="space-y-0.5 px-3">
              {menuItems.map((item) => {
                if ('type' in item && item.type === 'divider') {
                  return <div key={item.id} className="mx-2 my-2.5 h-px bg-border" />;
                }

                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={cn(
                      'group flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium',
                      'transition-colors duration-150 relative',
                      isActive
                        ? 'bg-primary/8 text-primary dark:bg-main/10 dark:text-main font-semibold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                    onClick={() => {
                      onTabChange(item.id);
                      onClose();
                    }}
                  >
                    {/* Active bar indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary dark:bg-main" />
                    )}
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors duration-150',
                        isActive
                          ? 'text-primary dark:text-main'
                          : 'text-muted-foreground group-hover:text-foreground',
                      )}
                    />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.badge !== null && item.badge > 0 && (
                      <Badge variant="default" className="h-5 min-w-5 px-1.5 text-[10px]">
                        {item.badge}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </nav>
          </ScrollArea>

          {/* ── Footer ── */}
          <div className="mx-4 h-px bg-border" />
          <div className="p-3">
            <button
              type="button"
              className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-destructive hover:bg-destructive/8 dark:text-[hsl(0_63%_65%)] dark:hover:bg-destructive/8 transition-colors duration-150"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
              {t.common.logout}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
