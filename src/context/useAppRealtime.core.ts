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

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.log(`[Realtime] Subscription status: ${status} — will retry in 5s.`);
        supabase.removeChannel(channel).catch(() => { });
        subscriptionsInitialized.current = false;
        subscriptionRef.current = null;
        timers.retry = setTimeout(() => {
          if (userRef.current && profileRef.current && !subscriptionsInitialized.current && !subscriptionRef.current) {
            setReconnectTrigger(prev => prev + 1);
          }
        }, 5000);
      } else if (status === 'SUBSCRIBED') {
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
