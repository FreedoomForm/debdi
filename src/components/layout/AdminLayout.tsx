'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { ChefHat, DollarSign, ShoppingCart, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { MobileHeader } from './MobileHeader';
import { Sidebar } from './Sidebar';

interface AdminLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  userName?: string;
}

export function AdminLayout({ children, activeTab, onTabChange, onLogout, userName }: AdminLayoutProps) {
  const { t, language } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const tabLabels = {
    statistics: t.admin.statistics,
    orders: t.admin.orders,
    map: language === 'ru' ? 'Карта' : language === 'uz' ? 'Xarita' : 'Map',
    warehouse: t.warehouse.title,
    cooking: t.warehouse.cooking,
    sets: language === 'ru' ? 'Наборы' : language === 'uz' ? "To'plamlar" : 'Sets',
    finance: t.finance.title,
    clients: t.admin.clients,
    couriers: t.admin.couriers,
    chat: t.courier.chat,
    settings: t.admin.settings,
    admins: t.admin.admins,
    bin: t.admin.bin,
    history: t.admin.history,
    profile: t.common.profile,
  };

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="flex min-h-screen min-h-dvh bg-background text-foreground relative">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={onLogout}
        className="z-50"
      />

      {/* Main content area */}
      <div className="relative flex min-w-0 flex-1 flex-col z-10">
        {/* Mobile hamburger (only visible on small screens) */}
        <Button
          variant="outline"
          size="icon-sm"
          className="fixed left-3 top-3 z-[120] lg:hidden shadow-[var(--shadow-sm)]"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </Button>

        <MobileHeader
          onMenuClick={() => setIsSidebarOpen(true)}
          currentTab={activeTab}
          tabLabels={tabLabels}
          userName={userName}
          onLogout={onLogout}
        />

        {/* ── Main content panel ── */}
        <main className="flex-1 overflow-auto relative z-10 pt-3 px-3 pb-20 lg:p-5 xl:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'h-full min-h-[80vh]',
                'rounded-xl lg:rounded-2xl',
                'border border-border',
                'bg-card',
                'p-4 md:p-5 lg:p-6',
                'shadow-[var(--shadow-sm)]',
                'relative overflow-hidden',
              )}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* ── Mobile bottom nav ── */}
        <nav className="safe-area-inset-bottom fixed bottom-3 left-3 right-3 z-40 rounded-xl border border-border bg-card px-2 py-2 lg:hidden shadow-[var(--shadow-lg)]">
          <div className="mx-auto flex max-w-md items-center justify-around">
            <MobileNavItem
              isActive={activeTab === 'orders'}
              onClick={() => onTabChange('orders')}
              label="Orders"
              icon={ShoppingCart}
            />
            <MobileNavItem
              isActive={activeTab === 'clients'}
              onClick={() => onTabChange('clients')}
              label="Clients"
              icon={Users}
            />
            <MobileNavItem
              isActive={activeTab === 'cooking'}
              onClick={() => onTabChange('cooking')}
              label="Cooking"
              icon={ChefHat}
            />
            <MobileNavItem
              isActive={activeTab === 'finance'}
              onClick={() => onTabChange('finance')}
              label="Finance"
              icon={DollarSign}
            />
          </div>
        </nav>

        <div className="h-16 lg:hidden" />
      </div>
    </div>
  );
}

function MobileNavItem({
  isActive,
  onClick,
  label,
  icon: Icon,
}: {
  isActive: boolean;
  onClick: () => void;
  label: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex min-w-[56px] flex-col items-center justify-center rounded-lg px-3 py-1.5',
        'transition-colors duration-150',
        isActive
          ? 'text-primary dark:text-main'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {isActive && (
        <motion.div
          layoutId="mobile-nav-active"
          className="absolute inset-0 rounded-lg bg-primary/8 dark:bg-main/10"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <Icon className="relative z-10 h-[18px] w-[18px]" />
      <span className="relative z-10 mt-0.5 text-[10px] font-semibold tracking-wide">{label}</span>
    </button>
  );
}
