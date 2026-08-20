import { localDb, isPendingDelete } from '../../lib/localDb';
import {
  useUsersStore,
} from '../../stores';
import {
  mapSalesman,
} from '../../lib/services';
import { RealtimeCtx } from './types';

export function attachBundleHandlers(channel: any, ctx: RealtimeCtx) {
  const { appSalesmen } = ctx;

  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_order_items' }, async (payload) => {
      if (await isPendingDelete('purchase_order_items', payload.new?.id || payload.old?.id)) return;
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        await localDb.purchaseOrderItems.put(payload.new).catch(() => { });
      } else if (payload.eventType === 'DELETE') {
        await localDb.purchaseOrderItems.delete(payload.old.id).catch(() => { });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bundles' }, async (payload) => {
      if (await isPendingDelete('bundles', payload.new?.id || payload.old?.id)) return;
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        await localDb.bundles.put(payload.new).catch(() => { });
      } else if (payload.eventType === 'DELETE') {
        await localDb.bundles.delete(payload.old.id).catch(() => { });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bundle_items' }, async (payload) => {
      if (await isPendingDelete('bundle_items', payload.new?.id || payload.old?.id)) return;
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        await localDb.bundleItems.put(payload.new).catch(() => { });
      } else if (payload.eventType === 'DELETE') {
        await localDb.bundleItems.delete(payload.old.id).catch(() => { });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bundle_slots' }, async (payload) => {
      if (await isPendingDelete('bundle_slots', payload.new?.id || payload.old?.id)) return;
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        await localDb.bundleSlots.put(payload.new).catch(() => { });
      } else if (payload.eventType === 'DELETE') {
        await localDb.bundleSlots.delete(payload.old.id).catch(() => { });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bundle_slot_options' }, async (payload) => {
      if (await isPendingDelete('bundle_slot_options', payload.new?.id || payload.old?.id)) return;
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        await localDb.bundleSlotOptions.put(payload.new).catch(() => { });
      } else if (payload.eventType === 'DELETE') {
        await localDb.bundleSlotOptions.delete(payload.old.id).catch(() => { });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'variant_stock_history' }, async (payload) => {
      if (await isPendingDelete('variant_stock_history', payload.new?.id || payload.old?.id)) return;
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        await localDb.variantStockHistory.put(payload.new).catch(() => { });
      } else if (payload.eventType === 'DELETE') {
        await localDb.variantStockHistory.delete(payload.old.id).catch(() => { });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'salesmen' }, async (payload) => {
      if (await isPendingDelete('salesmen', payload.new?.id || payload.old?.id)) return;
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const mapped = mapSalesman(payload.new);
        await localDb.salesmen.put(mapped).catch(() => { });
        const exists = appSalesmen.some(s => s.id === mapped.id);
        if (payload.eventType === 'INSERT' && !exists) {
          useUsersStore.getState().addSalesman(mapped);
        } else {
          useUsersStore.getState().updateSalesman(mapped);
        }
      } else if (payload.eventType === 'DELETE') {
        await localDb.salesmen.delete(payload.old.id).catch(() => { });
        useUsersStore.getState().deleteSalesman(payload.old.id);
      }
    });
}
