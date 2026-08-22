import { useSettingsStore, useUsersStore } from '../stores';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/SupabaseAppContext';
import { useTouchKeyboard } from '../providers/TouchKeyboardProvider';
import { useState } from 'react';
import { Suspense } from 'react';
import { LoginPage } from '../components/auth/LoginPage';
import { ResetPasswordPage } from '../components/auth/ResetPasswordPage';
import { Header } from '../components/layout/Header';
import { SkeletonLoader } from '../shared/ui/SkeletonLoader';
import { Toaster } from 'sonner';
import { DialogProvider } from '../shared/ui/DialogProvider';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import { AppRoutes } from '../appRoutes';
import { LoadingView } from './LoadingView';
import { useAppGlobalEffects } from './useAppGlobalEffects';

export function AppContent() {
  const appSettings = useSettingsStore(s => s.settings);
  const appLoading = useSettingsStore(s => s.loading);
  const appSyncProgress = useSettingsStore(s => s.syncProgress);
  const appCurrentUser = useUsersStore(s => s.currentUser);

  const { user, loading, isRecoveringPassword } = useAuth();
  useApp();
  useTouchKeyboard();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useAppGlobalEffects();

  if (loading || (user && !appCurrentUser && appLoading)) {
    return <SkeletonLoader type="list" count={8} />;
  }

  return (
    <>
      <Toaster
        className="!z-[999999]"
        position="top-center"
        expand={false}
        visibleToasts={3}
        richColors
        closeButton
        duration={3000}
        theme={appSettings.theme === 'auto' ? 'system' : appSettings.theme as any}
        style={{ zIndex: 999999 }}
        toastOptions={{
          className: 'touch-none',
          style: {
            borderRadius: '1.25rem',
            padding: '12px 16px',
            fontSize: '11px',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
          success: {
            style: {
              background: '#10b981',
              color: '#fff',
            },
          },
          error: {
            style: {
              background: '#f43f5e',
              color: '#fff',
            },
          },
          warning: {
            style: {
              background: '#f59e0b',
              color: '#fff',
            },
          },
          info: {
            style: {
              background: '#3b82f6',
              color: '#fff',
            },
          },
        }}
      />
      <div dir="ltr" className="fixed inset-0 w-full bg-gray-50 dark:bg-app flex flex-col overflow-hidden">
        {isRecoveringPassword ? (
        <ResetPasswordPage />
      ) : !user || !appCurrentUser || !appCurrentUser.active ? (
        <LoginPage />
      ) : (
        <>
          <DialogProvider />
          <Header onShowMobileMenu={() => setIsMobileMenuOpen(true)} isMobileMenuOpen={isMobileMenuOpen} onHideMobileMenu={() => setIsMobileMenuOpen(false)} />
          <main className="flex-1 min-h-0 relative overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-app" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
              <ErrorBoundary>
              <Suspense fallback={<LoadingView />}>
                <AppRoutes />
              </Suspense>
             </ErrorBoundary>

            {appLoading && (
              <div className="absolute inset-0 bg-white/60 dark:bg-black/80 z-[100] flex items-center justify-center animate-in fade-in">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-8 w-8 bg-primary/10 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  {appSyncProgress && (
                    <div className="bg-white dark:bg-surface px-8 py-6 rounded-[2rem] shadow-2xl border border-gray-200 dark:border-white/5 flex flex-col items-center min-w-[320px] animate-in slide-in-from-bottom-4">
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">{appSyncProgress.status}</p>
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full mt-4 overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-500 ease-out"
                          style={{ width: `${(appSyncProgress.current / appSyncProgress.total) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between w-full mt-3">
                        <span className="text-[9px] font-black text-gray-600">STAGE {appSyncProgress.current}/{appSyncProgress.total}</span>
                        {appSyncProgress.size && <span className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">{appSyncProgress.size} DATA</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
          <MobileBottomNav onShowMenu={() => setIsMobileMenuOpen(true)} />
        </>
      )}
      </div>
    </>
  );
}
