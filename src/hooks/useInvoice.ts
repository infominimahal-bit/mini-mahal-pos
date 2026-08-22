import { useSalesStore, useSettingsStore, useCartStore, useExpensesStore, useInventoryStore, useProductsStore, useUsersStore } from '../stores';
import { useAppStore } from '../stores';
import { localDb } from '../lib/localDb';
import { supabase } from '../lib/supabase';
import { generateNextInvoiceNumber, getNextInvoiceNumber } from '../lib/services';

export function useInvoiceGeneration() {
  const appSettings = useSettingsStore(s => s.settings);

  return async () => {
    // 1. Attempt Server-Side Atomic Generation First
    try {
       if (navigator.onLine) {
           const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000));
           const { data, error } = await Promise.race([
               supabase.rpc('get_next_invoice_number'),
               timeoutPromise
           ]);
           if (!error && data && typeof data === 'string') {
               const invoiceNumber = data;
               const parts = invoiceNumber.split('-');
               if (parts.length > 1) {
                   const newCounter = parseInt(parts[1], 10);
                   if (!isNaN(newCounter)) {
                       useSettingsStore.getState().incrementInvoiceCounter(newCounter);
                        localDb.appSettings.update('00000000-0000-4000-8000-000000000001', { invoiceCounter: newCounter }).catch(() => {});
                   }
               }
               return invoiceNumber;
           }
       }
    } catch (e) {
       console.warn('[Invoice] Server-side generation failed or timed out, falling back to local counter', e);
    }

    // 2. Fallback: Local optimistic generation
    let { invoiceNumber, newCounter } = generateNextInvoiceNumber(appSettings);

    // Auto-correction: Prevent duplicate invoice numbers locally
    let isCollision = true;
    while (isCollision) {
        const existingSale = await localDb.sales.where('invoiceNumber').equals(invoiceNumber).first();
            
        if (!existingSale) {
            isCollision = false;
        } else {
            console.warn(`[Invoice] Collision detected for ${invoiceNumber}, auto-incrementing to next.`);
            newCounter++;
            invoiceNumber = `${appSettings.invoicePrefix}-${newCounter.toString().padStart(6, '0')}`;
        }
    }

    // 3. Dispatch to local React state INSTANTLY
    useSettingsStore.getState().incrementInvoiceCounter(newCounter);
    
    // Also persist the corrected counter to localDb so next time it starts from here
    localDb.appSettings.update('00000000-0000-4000-8000-000000000001', { invoiceCounter: newCounter }).catch(() => {});

    return invoiceNumber;
  };
}

export function resetInvoiceCounter(dispatch: any, newCounter: number = 0) {
  useSettingsStore.getState().incrementInvoiceCounter(newCounter);
}

export function setInvoicePrefix(dispatch: any, prefix: string) {
  useSettingsStore.getState().setSettings({ invoicePrefix: prefix });
}

export function useInvoiceStats() {
  const appSales = useSalesStore(s => s.sales);
  const appSettings = useSettingsStore(s => s.settings);

  return () => {
    const totalInvoices = appSales.length;
    const currentCounter = appSettings.invoiceCounter;
    const prefix = appSettings.invoicePrefix;
    const nextInvoiceNumber = getNextInvoiceNumber(appSettings);

    return {
      totalInvoices,
      currentCounter,
      prefix,
      nextInvoiceNumber,
    };
  };
}
