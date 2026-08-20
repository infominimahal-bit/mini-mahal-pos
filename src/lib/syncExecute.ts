import { supabase } from './supabase';
import { localDb, PendingOp, SETTINGS_ID } from './localDb';
import { signAction, withActor } from './actionToken';
import { filterPayload, recordBlacklistedColumn } from './syncHelpers';

async function executeOp(op: PendingOp): Promise<void> {
    if (op.entity === 'payment_movements') {
      try {
        await supabase.rpc('apply_payment_movements', { p_moves: op.payload });
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

    const table = op.entity; // entity name matches table name now (except legacy which are handled)
    const { opType, entityId, payload: originalPayload } = op;
    const MAX_SCHEMA_RETRIES = 10;
    let schemaRetries = 0;

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
            // Sales retry (create) via commit_sale
            else if (op.entity === 'sales' && opType === 'create') {
                const rpcPayload = { p_sale: payload, p_history: payload.history || [] };
                const result = await supabase.rpc('commit_sale', rpcPayload);
                error = result.error;
            }
            // Sales retry (update/edit) via edit_sale_atomic
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
            // Refund retry
            else if (op.entity === 'sales' && opType === 'update' && (payload.status === 'refunded' || payload.status === 'partially_refunded')) {
                const result = await supabase.rpc('process_return', { sale_id: entityId, return_data: payload });
                error = result.error;
                if (!error && result.data && result.data.success === false) {
                    error = new Error(result.data.error || 'Unknown process_return error');
                }
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
            // Sales retry (delete) via delete_sale_atomic
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
                // Upsert/Create
                const conflictEntities = ['products', 'customers', 'suppliers'];
                if (conflictEntities.includes(op.entity)) {
                    const { data: remote } = await supabase.from(table as any).select('updated_at').eq('id', entityId).maybeSingle();
                    if (remote?.updated_at) {
                        const localUpdatedAt = payload.updated_at || payload.updatedAt;
                        if (localUpdatedAt && new Date(localUpdatedAt).getTime() < new Date(remote.updated_at).getTime()) {
                            return; // Remote newer, skip
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
                return; // Treat as success
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

export { executeOp };
