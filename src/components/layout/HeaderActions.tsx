import { useNavigate } from 'react-router-dom';
import { RefreshCw, Sun, Moon, Settings, LogOut } from 'lucide-react';
import { sonner } from '../../lib/sonner';
import { can } from '../../lib/permissions';
import { Button, Avatar } from '../../shared/ui';

interface HeaderActionsProps {
  appSettings: any;
  appCurrentUser: any;
  toggleTheme: () => void;
  handleLogout: () => void;
  onShowMobileMenu?: () => void;
  forceSync: () => Promise<void>;
}

export function HeaderActions({ appSettings, appCurrentUser, toggleTheme, handleLogout, onShowMobileMenu, forceSync }: HeaderActionsProps) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
      <Button
        variant="ghost"
        onClick={async () => {
          try {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
              sonner.warning("Offline — local data dikhaya ja raha hai. Cloud sync ke liye internet connect karein.");
              return;
            }
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.filter(k => k.startsWith('supabase')).map(key => caches.delete(key)));
            }
            sessionStorage.clear();
            if ('serviceWorker' in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map((r) => r.unregister()));
            }
            sonner.success("Full cloud sync — sab devices pe same data aa raha hai...");
            await forceSync();
          } catch (err) {
            console.error('Force sync failed:', err);
            sonner.close();
          }
        }}
        title="Force Fresh Cloud Sync & Clear Cache"
        className="!min-h-0 !w-8 !h-8 sm:!w-9 sm:!h-9 !p-0 !rounded-full !text-blue-500 hover:!text-blue-700 dark:hover:!text-blue-300 hover:!bg-blue-500/10 dark:hover:!bg-blue-500/15"
      >
        <RefreshCw className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
      </Button>

      <Button
        variant="ghost"
        onClick={toggleTheme}
        title={appSettings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className={`!min-h-0 !w-8 !h-8 sm:!w-9 sm:!h-9 !p-0 !rounded-full ${
          appSettings.theme === 'dark'
            ? '!text-amber-400 hover:!bg-amber-400/10'
            : '!text-blue-600 hover:!bg-blue-600/10'
        }`}
      >
        {appSettings.theme === 'dark' ? <Sun className="h-4.5 w-4.5 sm:h-5 sm:w-5" /> : <Moon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />}
      </Button>

      <div
        onClick={() => onShowMobileMenu?.()}
        className="flex items-center gap-2 lg:gap-2.5 ml-1 cursor-pointer lg:cursor-default group"
      >
        <div className="hidden xl:block text-right leading-none">
          <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight truncate max-w-[110px]">
            {appCurrentUser?.name}
          </p>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <p className="text-[9px] font-bold text-primary uppercase tracking-widest">
              @{appCurrentUser?.username || 'user'}
            </p>
            <span className="text-[8px] text-gray-600 opacity-60">· {appCurrentUser?.role}</span>
          </div>
        </div>

        <Avatar
          src={appCurrentUser?.avatar || undefined}
          name={appCurrentUser?.name || 'Z'}
          size="sm"
          className="!h-8 !w-8 sm:!h-9 sm:!w-9 !shadow-sm active:!scale-95"
        />

        <div className="hidden md:flex items-center gap-0.5">
          {can(appCurrentUser?.role, 'view_settings') && (
          <Button
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); navigate('/settings'); }}
            aria-label="Settings"
            className="!min-h-0 !p-2 !rounded-full !text-gray-500 hover:!text-gray-700 dark:!text-gray-400 dark:hover:!text-white hover:!bg-gray-100 dark:hover:!bg-white/10"
          >
            <Settings className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </Button>
          )}
          <Button
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); handleLogout(); }}
            aria-label="Sign out"
            className="!min-h-0 !p-2 !rounded-full !text-gray-500 hover:!text-red-500 dark:!text-gray-400 dark:hover:!text-red-400 hover:!bg-red-500/10 dark:hover:!bg-red-500/15"
          >
            <LogOut className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
