import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { AppIcons } from '../../lib/icons';
import { SyncStatusBadge } from './SyncStatusBadge';
import { Button, Avatar } from '../../shared/ui';
import { can } from '../../lib/permissions';

interface MobileMenuDrawerProps {
  isMobileMenuOpen: boolean;
  onHideMobileMenu?: () => void;
  appCurrentUser: any;
  appSettings: any;
  navigationItems: any[];
  toggleTheme: () => void;
  handleLogout: () => void;
}

export function MobileMenuDrawer({
  isMobileMenuOpen,
  onHideMobileMenu,
  appCurrentUser,
  appSettings,
  navigationItems,
  toggleTheme,
  handleLogout
}: MobileMenuDrawerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="fixed inset-0 z-[300] overflow-hidden">
      {/* Backdrop with slide-in mask */}
      <div 
        onClick={() => onHideMobileMenu?.()}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`} 
      />
      {/* Drawer Card */}
      <div 
        className={`fixed top-0 right-0 bottom-0 w-[280px] sm:w-[320px] lg:w-[450px] bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-xl shadow-2xl border-l border-gray-200/50 dark:border-white/5 flex flex-col z-[300] transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div 
          className="flex items-center justify-between mb-2 px-4 flex-shrink-0"
          style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter">ZAYNAHSPOS.COM</h2>
          </div>
          <Button
            variant="ghost"
            onClick={() => onHideMobileMenu?.()}
            aria-label="Close menu"
            className="!min-h-0 !p-1.5 !rounded-xl !bg-gray-50 dark:!bg-white/5 hover:!bg-gray-100 dark:hover:!bg-white/10 !text-gray-600 dark:!text-gray-400 active:!scale-90"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar"
          style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
        >
          {/* User card at top */}
          <div className="flex items-center gap-3 p-2 rounded-[1rem] bg-gray-50/50 dark:bg-primary/5 border border-gray-200/50 dark:border-primary/10 mb-1.5 shadow-sm mx-4">
            <Avatar
              src={appCurrentUser?.avatar || undefined}
              name={appCurrentUser?.name || 'Z'}
              size="sm"
              shape="square"
              className="!h-9 !w-9 !rounded-lg !ring-2 !ring-white dark:!ring-white/5 !shadow-lg"
            />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight leading-tight truncate">
                {appCurrentUser?.name}
              </p>
              <div className="flex flex-col gap-0.5 mt-1">
                <p className="text-[11px] font-bold text-primary uppercase tracking-widest">
                  @{appCurrentUser?.username || 'user'}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-gray-600 opacity-80 capitalize font-bold">{appCurrentUser?.role}</span>
                  <div className="transform scale-90 origin-right">
                    <SyncStatusBadge />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Section Label */}
          <p className="px-6 mb-2 text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-[0.2em]">{"Management Tools"}</p>

          {/* Nav grid — 3 cols */}
          <nav className="grid grid-cols-3 gap-1 mb-2 px-4">
            {navigationItems.map((item) => {
              const active = location.pathname === '/' + item.id || location.pathname.startsWith('/' + item.id + '/');
              return (
                <button key={item.id}
                  onClick={() => { navigate('/' + item.id); onHideMobileMenu?.(); }}
                  className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl transition-all duration-300 group ${active
                    ? 'bg-primary text-white shadow-xl shadow-emerald-500/25 scale-105'
                    : 'bg-gray-50 dark:bg-white/[0.03] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}>
                  <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-white/20' : 'bg-white dark:bg-black/20 shadow-sm'}`}>
                    <item.icon className={`h-4 w-4 ${active ? 'text-white' : item.color}`} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tight leading-none text-center">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Account Settings Label */}
          <p className="px-6 mb-2 text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-[0.2em]">{"System & Account"}</p>

          <div className="flex flex-col gap-2 px-4 pb-6">
            <Button
              variant="secondary"
              onClick={toggleTheme}
              className="!min-h-0 !justify-between !w-full !p-2.5 !rounded-xl !text-[11px] !font-black !bg-gray-50 dark:!bg-white/5 !text-gray-700 dark:!text-gray-300 hover:!bg-gray-100 dark:hover:!bg-white/10 !border-gray-200 dark:!border-white/5"
            >
              <div className="flex items-center gap-3">
                {appSettings.theme === 'dark' ? <AppIcons.moon className="h-5 w-5 text-blue-400" /> : <AppIcons.sun className="h-5 w-5 text-amber-500" />}
                <span>{appSettings.theme === 'dark' ? "Dark Mode" : "Light Mode"}</span>
              </div>
              <div className={`w-10 h-5 rounded-full p-1 transition-colors ${appSettings.theme === 'dark' ? 'bg-primary' : 'bg-gray-300'}`}>
                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${appSettings.theme === 'dark' ? 'translate-x-5' : ''}`} />
              </div>
            </Button>

            {can(appCurrentUser?.role, 'view_settings') && (
            <Button
              variant="secondary"
              onClick={() => { navigate('/settings'); onHideMobileMenu?.(); }}
              className="!min-h-0 !justify-start !w-full !gap-3 !p-2.5 !rounded-xl !text-[11px] !font-black !bg-gray-50 dark:!bg-white/5 !text-gray-700 dark:!text-gray-300 hover:!bg-gray-100 dark:hover:!bg-white/10 !border-gray-200 dark:!border-white/5"
            >
              <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500">
                <AppIcons.settings className="w-5 h-5" />
              </div>
              {"Settings"}
            </Button>
            )}

            <Button
              variant="danger"
              onClick={() => { onHideMobileMenu?.(); handleLogout(); }}
              className="!min-h-0 !justify-start !w-full !gap-3 !px-4 !py-3.5 !bg-red-500 !rounded-2xl !font-black !shadow-xl !shadow-red-500/20 hover:!opacity-100"
            >
              <div className="p-2.5 rounded-2xl bg-white/20 text-white">
                <AppIcons.logout className="h-5 w-5" />
              </div>
              {"Logout Account"}
            </Button>
          </div>

          {/* Version / Copyright */}
          <div className="mt-2 mb-8 text-center">
            <p className="text-[10px] font-black text-gray-600 dark:text-white/10 uppercase tracking-[0.3em]">POS v12.0</p>
          </div>
        </div>

      </div>
    </div>
  );
}
