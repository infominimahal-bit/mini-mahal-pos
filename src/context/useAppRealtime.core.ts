import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  useSalesStore,
  useUsersStore,
} from '../stores';
import { useAuth } from './AuthContext';
import { RealtimeCtx } from './realtime/types';
import { attachCoreHandlers } from './realtime/handlers-core';
import { attachCatalogHandlers } from './realtime/handlers-catalog';
import { attachLedgerHandlers } from './realtime/handlers-ledger';
import { attachBundleHandlers } from './realtime/handlers-bundles';

export function useAppRealtime(subscriptionsInitialized: React.MutableRefObject<boolean>, reconnectTrigger: number, setReconnectTrigger: React.Dispatch<React.SetStateAction<number>>) {
  const { user, profile } = useAuth();
  const subscriptionRef = useRef<any>(null);
  const userRef = useRef(user);
  const profileRef = useRef(profile);
  const retryAttempt = useRef(0);
  
  userRef.current = user;
  profileRef.current = profile;
  
  const appSalesmen = useUsersStore(s => s.salesmen);
  const appSales = useSalesStore(s => s.sales);

  useEffect(() => {
    const handleOffline = () => {
      console.log('[Realtime] Offline — disconnecting WebSocket.');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current).catch(() => { });
        subscriptionRef.current = null;
        subscriptionsInitialized.current = false;
      }
    };
    const handleOnline = () => {
      console.log('[Realtime] Online — tearing down stale subscription for re-init.');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current).catch(() => { });
        subscriptionRef.current = null;
      }
      subscriptionsInitialized.current = false;
      setReconnectTrigger(prev => prev + 1);
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (!user || !profile) return;

    const timers = { retry: null as any, settingsDebounce: null as any };

    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current).catch(() => { });
      subscriptionRef.current = null;
    }

    if (subscriptionsInitialized.current) return;
    subscriptionsInitialized.current = true;

    const ctx: RealtimeCtx = { user, appSales, appSalesmen, timers };

    const channelName = `db-changes-global-${Date.now()}`;
    const channel = supabase
      .channel(channelName);

    attachCoreHandlers(channel, ctx);
    attachCatalogHandlers(channel, ctx);
    attachLedgerHandlers(channel, ctx);
    attachBundleHandlers(channel, ctx);

    const MAX_RETRIES = 10;
    let givenUp = false;

    channel.subscribe((status) => {
      if (givenUp) return;

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        const attempt = retryAttempt.current++;
        if (attempt >= MAX_RETRIES) {
          givenUp = true;
          console.warn(`[Realtime] Gave up after ${MAX_RETRIES} retries. Refresh the page to reconnect.`);
          supabase.removeChannel(channel).catch(() => { });
          subscriptionRef.current = null;
          return;
        }
        const delay = Math.min(30000, 2000 * 2 ** Math.min(attempt, 4)) + Math.floor(Math.random() * 1000);
        console.log(`[Realtime] ${status} — retry in ${Math.round(delay / 1000)}s (${attempt + 1}/${MAX_RETRIES}).`);
        supabase.removeChannel(channel).catch(() => { });
        subscriptionsInitialized.current = false;
        subscriptionRef.current = null;
        timers.retry = setTimeout(() => {
          if (userRef.current && profileRef.current && !subscriptionsInitialized.current && !subscriptionRef.current) {
            setReconnectTrigger(prev => prev + 1);
          }
        }, delay);
      } else if (status === 'SUBSCRIBED') {
        retryAttempt.current = 0;
        console.log(`[Realtime] Subscription active (single-tenant).`);
      }
    });

    subscriptionRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      subscriptionRef.current = null;
      subscriptionsInitialized.current = false;
      if (timers.retry) clearTimeout(timers.retry);
      if (timers.settingsDebounce) clearTimeout(timers.settingsDebounce);
    };
  }, [user, profile, reconnectTrigger]);
}
