import { useSettingsStore, useUsersStore } from '../../stores';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Users
} from 'lucide-react';
import { AppIcons } from '../../lib/icons';
import { settingsService } from '../../lib/services';
import { useApp } from '../../context/SupabaseAppContext';
import { useAuth } from '../../context/AuthContext';
import { sonner } from '../../lib/sonner';
import { can } from '../../lib/permissions';
import { Button } from '../../shared/ui';
import { MobileMenuDrawer } from './MobileMenuDrawer';
import { HeaderActions } from './HeaderActions';

export interface HeaderProps {
  onShowMobileMenu?: () => void;
  onHideMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export function Header({
  onShowMobileMenu,
  onHideMobileMenu,
  isMobileMenuOpen = false
}: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const appCurrentUser = useUsersStore(s => s.currentUser);
  const appSettings = useSettingsStore(s => s.settings);
  const { forceSync } = useApp();
  const { signOut } = useAuth();
  const [renderDrawer, setRenderDrawer] = useState(isMobileMenuOpen);

  useEffect(() => {
    if (isMobileMenuOpen) {
      setRenderDrawer(true);
    } else {
      const timer = setTimeout(() => setRenderDrawer(false), 500); // 500ms slide-out transition
      return () => clearTimeout(timer);
    }
  }, [isMobileMenuOpen]);

  const navRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    if (isMoreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreOpen]);

  const checkScroll = useCallback(() => {
    if (navRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navRef.current;
      setCanScrollLeft(scrollLeft > 1);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  useEffect(() => { setTimeout(checkScroll, 100); }, [appCurrentUser, checkScroll]);

  const scrollNav = (direction: 'left' | 'right') => {
    navRef.current?.scrollBy({ left: direction === 'left' ? -160 : 160, behavior: 'smooth' });
  };

  useEffect(() => {
    if (navRef.current) {
      const activeBtn = navRef.current.querySelector('[data-active="true"]') as HTMLElement;
      activeBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
    if (mobileNavRef.current) {
      const activeBtn = mobileNavRef.current.querySelector('[data-active="true"]') as HTMLElement;
      activeBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [location.pathname]);

  const toggleTheme = async () => {
    const newTheme = (appSettings.theme || 'dark') === 'dark' ? 'light' : 'dark';
    useSettingsStore.getState().setSettings({ theme: newTheme });
    try {
      localStorage.setItem('theme', newTheme);
      await settingsService.update({ theme: newTheme });
    } catch (err) {
      console.error('Failed to save theme:', err);
    }
  };

  const handleLogout = async () => {
    const result = await sonner.confirm("Sign Out", "Are you sure you want to sign out?", "Sign Out");
    if (result.isConfirmed) {
      try { await signOut(); } catch { sonner.error('Failed to sign out. Please try again.'); }
    }
  };

  const getNavigationItems = () => {
    const role = appCurrentUser?.role;
    const items = [];

    if (can(role, 'view_dashboard')) items.push({ id: 'dashboard', label: "Dashboard", icon: AppIcons.dashboard, color: 'text-primary' });
    if (can(role, 'view_pos')) items.push({ id: 'pos', label: "POS", icon: AppIcons.pos, color: 'text-blue-500' });

    if (can(role, 'view_transactions')) items.push({ id: 'transactions', label: "Sales", icon: AppIcons.sales, color: 'text-orange-500' });
    if (can(role, 'view_expenses')) items.push({ id: 'expenses', label: "Expenses", icon: AppIcons.expenses, color: 'text-rose-500' });
    if (can(role, 'view_inventory')) items.push({ id: 'inventory', label: "Inventory", icon: AppIcons.inventory, color: 'text-purple-500' });
    if (can(role, 'view_customers')) items.push({ id: 'customers', label: "Customers", icon: AppIcons.customers, color: 'text-sky-500' });
    if (can(role, 'view_discounts')) items.push({ id: 'discounts', label: "Discounts", icon: AppIcons.discounts, color: 'text-pink-500' });
    if (can(role, 'view_reports')) items.push({ id: 'reports', label: "Reports", icon: AppIcons.reports, color: 'text-red-500' });
    if (can(role, 'view_suppliers')) items.push({ id: 'suppliers', label: "Suppliers", icon: AppIcons.suppliers, color: 'text-amber-500' });
    if (can(role, 'view_users')) items.push({ id: 'users', label: 'Users', icon: Users, color: 'text-indigo-500' });

    return items;
  };

  const navigationItems = getNavigationItems();

  return (
    <header className={`bg-white dark:bg-app border-b border-gray-200 dark:border-white/5 sticky top-0 ${isMobileMenuOpen ? 'z-[400]' : 'z-[40]'} lg:z-[40] pt-[env(safe-area-inset-top)] px-safe`}>
      <div className="flex items-center h-12 lg:h-[72px] px-3 md:px-6 gap-2 lg:gap-4">
        <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
          <div className="rounded-lg lg:rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 bg-white overflow-hidden flex items-center justify-center">
            {appSettings.storeLogo ? (
              <img src={appSettings.storeLogo} alt="Logo"
                className="h-7 w-7 md:h-12 md:w-12 lg:h-14 lg:w-14 object-contain p-0.5" />
            ) : (
              <img src="/zaynahs-logo.svg" alt="POS"
                className="h-7 w-7 md:h-12 md:w-12 lg:h-14 lg:w-14 object-contain p-1" />
            )}
          </div>
          <div className="hidden xs:block leading-none">
            <p className="text-[14px] md:text-[17px] lg:text-lg font-black text-gray-900 dark:text-white tracking-tight truncate max-w-[120px] sm:max-w-[160px] lg:max-w-[220px]">
              {appSettings.storeName}
            </p>
            <p className="hidden sm:block text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.25em] text-primary mt-1 lg:mt-1.5 opacity-90">
              ZAYNAHSPOS.COM
            </p>
          </div>
        </div>

        <div className="hidden md:block h-7 w-px bg-gray-100 dark:bg-white/5 flex-shrink-0 mx-1" />

        <div className="hidden md:flex items-center flex-1 min-w-0 relative">
          {canScrollLeft && (
            <Button
              variant="ghost"
              onClick={() => scrollNav('left')}
              aria-label="Scroll navigation left"
              className="!absolute !left-0 !z-10 !w-8 !h-full !min-h-0 !p-0 !rounded-none !justify-center
                         !bg-gradient-to-r !from-white dark:!from-[#0A0A0A] !to-transparent
                         !text-gray-600 hover:!text-primary !transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <div ref={navRef}
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth w-full snap-x snap-mandatory px-4 lg:px-6"
            style={{ paddingLeft: canScrollLeft ? 32 : undefined, paddingRight: canScrollRight ? 32 : undefined }}>
            {navigationItems.map((item) => {
              const active = location.pathname === '/' + item.id || location.pathname.startsWith('/' + item.id + '/');
              return (
                <button key={item.id} data-active={active} onClick={() => navigate('/' + item.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl
                    text-[10px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0
                    transition-all duration-300 group snap-start
                    ${active
                      ? 'bg-emerald-50 dark:bg-primary/10 text-primary dark:text-emerald-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}>
                  <item.icon className={`w-3.5 h-3.5 flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6
                    ${active ? 'text-primary' : item.color}`} />
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-primary
                                     shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  )}
                </button>
              );
            })}
          </div>
          {canScrollRight && (
            <Button
              variant="ghost"
              onClick={() => scrollNav('right')}
              aria-label="Scroll navigation right"
              className="!absolute !right-0 !z-10 !w-8 !h-full !min-h-0 !p-0 !rounded-none !justify-center
                         !bg-gradient-to-l !from-white dark:!from-[#0A0A0A] !to-transparent
                         !text-gray-600 hover:!text-primary !transition-colors">
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 md:hidden" />

        <HeaderActions
          appSettings={appSettings}
          appCurrentUser={appCurrentUser}
          toggleTheme={toggleTheme}
          handleLogout={handleLogout}
          onShowMobileMenu={onShowMobileMenu}
          forceSync={forceSync}
        />
      </div>

      {renderDrawer && (
        <MobileMenuDrawer
          isMobileMenuOpen={isMobileMenuOpen}
          onHideMobileMenu={onHideMobileMenu}
          appCurrentUser={appCurrentUser}
          appSettings={appSettings}
          navigationItems={navigationItems}
          toggleTheme={toggleTheme}
          handleLogout={handleLogout}
        />
      )}
    </header>
  );
}
