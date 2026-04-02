'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bell, LogOut, Menu, Settings, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BasicDropdown, type DropdownItem } from '@/components/smoothui';

interface MobileHeaderProps {
  onMenuClick: () => void;
  currentTab: string;
  tabLabels: Record<string, string>;
  userName?: string;
  onLogout: () => void;
}

export function MobileHeader({
  onMenuClick,
  currentTab,
  tabLabels,
  userName,
  onLogout,
}: MobileHeaderProps) {
  const { t } = useLanguage();
  const resolvedUserName = userName ?? 'User';

  const actionItems: DropdownItem[] = [
    { id: 'profile', label: t.common.profile, icon: <User className="h-4 w-4" /> },
    { id: 'settings', label: t.admin.settings, icon: <Settings className="h-4 w-4" /> },
    { id: 'logout', label: t.common.logout, icon: <LogOut className="h-4 w-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background lg:hidden">
      <div className="flex h-12 items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={onMenuClick}
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex min-w-0 items-center">
          <span className="truncate text-sm font-semibold tracking-tight text-foreground">
            {tabLabels[currentTab] || currentTab}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative text-muted-foreground"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
              3
            </span>
          </Button>

          <div className="relative h-8 w-8">
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <Avatar className="h-7 w-7 border border-border shadow-[var(--shadow-xs)]">
                <AvatarFallback className="bg-primary/8 text-[10px] font-bold text-primary dark:bg-main/10 dark:text-main">
                  {resolvedUserName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <BasicDropdown
              className="h-8 w-8 opacity-0"
              label={t.common.profile}
              items={actionItems}
              onChange={(item) => {
                if (item.id === 'logout') onLogout();
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
