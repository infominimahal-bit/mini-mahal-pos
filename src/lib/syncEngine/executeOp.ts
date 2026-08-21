import { supabase } from '../supabase';
import { withActor, signAction } from '../actionToken';
import type { PendingOp } from '../types';
import { localDb, SETTINGS_ID, filterPayload, recordBlacklistedColumn } from './state';
import { useConflictStore } from '../../stores/conflictStore';

export async function executeOp(op: PendingOp): Promise<void> {
    if (op.entity === 'payment_movements') {
      try {
        await supabase.rpc('apply_payment_movements', { p_moves: op.payload });
        await localDb.pendingOps.delete(op.id!);
      } catch (e) {
        throw e;
      }
      return;
    }

    if (op.entity === 'sale_audit_log' && op.opType === 'create') {
      try {
        const { error: ae } = await supabase.from('sale_audit_log').insert(op.payload);
        if (ae && ae.code !== '23505') throw ae;
        await localDb.pendingOps.delete(op.id!);
      } catch (e) {
        throw e;
      }
      return;
    }

    if (op.entity === 'payment_modes' && (op.opType === 'upsert' || op.opType === 'update')) {
      try {
        const { error: me } = await supabase.from('payment_modes').upsert(op.payload, { onConflict: 'id' });
        if (me) throw me;
        await localDb.pendingOps.delete(op.id!);
      } catch (e) {
        throw e;
      }
      return;
    }

    if (op.entity === 'product_toppings') {
      try {
        if (op.opType === 'delete') {
          await supabase.from('product_toppings').delete().eq('product_id', op.entityId);
        } else {
          await supabase.from('product_toppings').upsert(op.payload);
        }
        await localDb.pendingOps.delete(op.id!);
      } catch (e) {
        throw e;
      }
      return;
    }

    const table = op.entity;
    const { opType, entityId, payload: originalPayload } = op;
    const MAX_SCHEMA_RETRIES = 10;
    let schemaRetries = 0;

    // BUG-C11/M03: multi-device conflict detection on sale updates.
    if (op.entity === 'sales' && (op.opType === 'update' || op.opType === 'upsert')) {
      // Tombstone check: a delete on another device wins.
      const { data: tomb } = await supabase
        .from('row_tombstones').select('ref_id').eq('ref_id', entityId).eq('table_name', 'sales').maybeSingle();
      if (tomb) {
        await localDb.sales.delete(entityId).catch(() => {});
        if (op.id != null) await localDb.pendingOps.delete(op.id).catch(() => {});
        useConflictStore.getState().addConflict({
          entity: 'sales', entityId,
          localVersion: originalPayload, cloudVersion: { status: 'deleted' }, pendingOpId: op.id as number,
        });
        return;
      }
      // updated_at conflict: cloud is newer and status differs → flag conflict, hold the op.
      const { data: cs } = await supabase
        .from('sales').select('id, updated_at, status').eq('id', entityId).maybeSingle();
      if (cs) {
        const cloudAt = new Date((cs as any).updated_at);
        const localAt = new Date((op as any).localUpdatedAt || (op as any).createdAt || 0);
        if (cloudAt > localAt && (cs as any).status !== originalPayload.status) {
          if (op.id != null) {
            await localDb.pendingOps.update(op.id, { conflictState: 'conflict', lastError: `CONFLICT: cloud=${(cs as any).updated_at}` }).catch(() => {});
          }
          useConflictStore.getState().addConflict({
            entity: 'sales', entityId,
            localVersion: originalPayload, cloudVersion: cs, pendingOpId: op.id as number,
          });
          return;
        }
      }
    }

    while (schemaRetries < MAX_SCHEMA_RETRIES) {
        let payload = filterPayload(op.entity, originalPayload);
        let error: any = null;

        try {
            if (op.entity === 'app_settings') {
                const profile = await localDb.users.toArray().then(u => u[0]);
                const role = profile?.role ?? 'cashier';
                if (!['admin', 'manager'].includes(role)) {
                    error = null;
                } else {
                    const { error: upsertError } = await supabase
                        .from('app_settings')
                        .upsert(await withActor({ ...payload, id: SETTINGS_ID, updated_at: new Date().toISOString() }, 'app_settings'), { onConflict: 'id' });
                    error = upsertError;
                }
            }
            else if (op.entity === 'sales' && opType === 'create') {
                const rpcPayload = { p_sale: payload, p_history: payload.history || [] };
                const result = await supabase.rpc('commit_sale', rpcPayload);
                error = result.error;
            }
            else if (op.entity === 'sales' && opType === 'update' && payload.isAtomicEdit) {
                const rpcPayload = {
                    p_new_sale: payload.newSale,
                    p_new_history: payload.newHistory,
                    p_old_sale_id: payload.oldSaleId,
                    p_old_reverse_history: payload.oldReverseHistory
                };
                const result = await supabase.rpc('edit_sale_atomic', rpcPayload);
                error = result.error;
            }
            else if (op.entity === 'sales' && opType === 'update' && (payload.status === 'refunded' || payload.status === 'partially_refunded')) {
                // BUG-C12: use the atomic refund RPC (not process_return) so stock +
                // status commit together and cannot diverge.
                const { error: refundErr } = await supabase.rpc('refund_sale_atomic', {
                    p_sale_id: entityId,
                    p_history: (op as any).history || [],
                    p_status: payload.status,
                    p_refunded_amount: Number(payload.refunded_amount || 0),
                });
                error = refundErr;
            }
            else if (op.entity === 'sales' && opType === 'update') {
                const guarded = await withActor({ ...payload, id: entityId }, 'sales');
                delete (guarded as any).id;
                const result = await supabase.from('sales').update(guarded as any).eq('id', entityId);
                error = result.error;
            }
            else if (op.entity === 'purchase_records' && opType === 'create') {
                const cleanPayload = { ...payload };
                delete cleanPayload.supplier_id;
                delete cleanPayload.supplierId;
                delete cleanPayload.retailPrice;
                delete cleanPayload.retail_price;
                delete cleanPayload.addedBy;
                delete cleanPayload.batches;
                const result = await supabase.from('purchase_records').upsert(cleanPayload, { onConflict: 'id' });
                error = result.error;
            }
            else if (opType === 'delete' && op.entity === 'sales') {
                const token = await signAction('delete_sale');
                const delBase: any = { p_sale_id: entityId, p_history: payload.history || [] };
                if (token) { delBase.p_user_id = token.p_user_id; delBase.p_role = token.p_role; delBase.p_sig = token.p_sig; }
                const rpcRes = await supabase.rpc('delete_sale_atomic', delBase);
                error = rpcRes.error;
            }
            else if (opType === 'delete') {
                const result = await supabase.from(table as any).delete().eq('id', entityId);
                error = result.error;
            }
            else {
                const conflictEntities = ['products', 'customers', 'suppliers'];
                if (conflictEntities.includes(op.entity)) {
                    const { data: remote } = await supabase.from(table as any).select('updated_at').eq('id', entityId).maybeSingle();
                    if (remote?.updated_at) {
                        const localUpdatedAt = payload.updated_at || payload.updatedAt;
                        if (localUpdatedAt && new Date(localUpdatedAt).getTime() < new Date(remote.updated_at).getTime()) {
                            return;
                        }
                    }
                }
                const guardedPayload = await withActor(payload, op.entity);
                const result = await (op.entity === 'stock_history' || op.entity === 'variant_stock_history'
                    ? supabase.from(table as any).insert(guardedPayload)
                    : supabase.from(table as any).upsert(guardedPayload, { onConflict: 'id' }));
                error = result.error;
            }

            if (!error) return;

            const errStr = (JSON.stringify(error) + (error.message || '')).toLowerCase();
            const isDuplicate = error.code === '23505' || (error.code === '409' && !errStr.includes('foreign key'));

            if (isDuplicate || errStr.includes('duplicate key') || errStr.includes('unique constraint')) {
                if (op.entity === 'sales' && opType === 'create' && errStr.includes('invoice_number')) {
                    try {
                        const { data, error: rpcError } = await supabase.rpc('get_next_invoice_number');
                        if (!rpcError && data) {
                            const newInvoiceNumber = data as string;
                            const updatedPayload = { ...payload, invoice_number: newInvoiceNumber };
                            await localDb.sales.update(entityId, { invoiceNumber: newInvoiceNumber });
                            await localDb.pendingOps.update(op.id!, { payload: updatedPayload });
                            throw new Error('RETRY_WITH_NEW_INVOICE');
                        }
                    } catch (e: any) {
                        if (e.message === 'RETRY_WITH_NEW_INVOICE') throw e;
                    }
                }
                return;
            }

            if ((error.code === '23503' || errStr.includes('foreign key')) && (op.entity === 'stock_history' || op.entity === 'purchase_records')) {
                if (op.id) await localDb.pendingOps.update(op.id, { status: 'error', errorMessage: `Orphaned record: Parent not found.` });
                return;
            }

            const possibleFKs = [
                { key: 'user_id', camel: 'userId', action: 'current_user' },
                { key: 'customer_id', camel: 'customerId', action: 'null' },
                { key: 'selected_customer_id', camel: 'selectedCustomerId', action: 'null' }
            ];

            let healed = false;
            for (const fk of possibleFKs) {
                if (errStr.includes(fk.key)) {
                    let newValue = null;
                    if (fk.action === 'current_user') {
                        const { data: { session } } = await supabase.auth.getSession();
                        let cachedUserId = null;
                        try {
                            const cached = localStorage.getItem('pos_offline_profile');
                            if (cached) cachedUserId = JSON.parse(cached).id;
                        } catch (_) { }
                        newValue = session?.user?.id || cachedUserId || null;
                    }

                    const updatedPayload = { ...op.payload, [fk.key]: newValue };
                    if (fk.camel in updatedPayload) updatedPayload[fk.camel] = newValue;
                    if (op.id) await localDb.pendingOps.update(op.id, { payload: updatedPayload });
                    healed = true;
                }
            }

            if (op.entity === 'users' && errStr.includes('users_id_fkey')) return;
            if (healed) throw error;
            if (error.code === 'PGRST202' || errStr.includes('Could not find the function')) throw new Error(`MISSING_BACKEND_FUNCTION`);

            if (error.code === '22P02' || error.code === '22003' || error.code === '23514' || errStr.includes('invalid input') || errStr.includes('check constraint')) {
                if (op.id) await localDb.pendingOps.update(op.id, { status: 'error', errorMessage: `Data/constraint error: ${error.message}.` });
                return;
            }

            if (error.code === 'P0007' || errStr.includes('stale_write')) return;
            if (recordBlacklistedColumn(op.entity, error.message || "")) {
                schemaRetries++;
                continue;
            }
            throw error;

        } catch (e: any) {
            if (recordBlacklistedColumn(op.entity, e.message || "")) {
                schemaRetries++;
                continue;
            }
            throw e;
        }
    }

    throw new Error(`Exceeded max schema retries for ${op.entity}`);
}
