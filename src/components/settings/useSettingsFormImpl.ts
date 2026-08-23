import { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores';
import { useAuth } from '../../context/AuthContext';
import { useSoundFeedback } from '../../hooks/useSoundFeedback';
import { sonner } from '../../lib/sonner';
import { supabase } from '../../lib/supabase';
import { AppSettings } from '../../types';
import { buildInitialFormData, syncFormDataFromSettings } from './settingsFormData';

export function useSettingsForm() {
  const appSettings = useSettingsStore(s => s.settings);
  const { profile } = useAuth();
  const { play } = useSoundFeedback();

  const [isSaving, setIsSaving] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const [formData, setFormData] = useState<any>(buildInitialFormData(appSettings));

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.getConfig().then((config: any) => {
        if (config.supabaseUrl) {
          const urlInput = document.getElementById('electron-supabase-url') as HTMLInputElement;
          if (urlInput) urlInput.value = config.supabaseUrl;
        }
        if (config.supabaseAnonKey) {
          const anonInput = document.getElementById('electron-supabase-anon') as HTMLInputElement;
          if (anonInput) anonInput.value = config.supabaseAnonKey;
        }
        if (config.supabaseServiceRoleKey) {
          const serviceInput = document.getElementById('electron-supabase-service') as HTMLInputElement;
          if (serviceInput) serviceInput.value = config.supabaseServiceRoleKey;
        }
      });
    }
  }, []);

  useEffect(() => {
    setFormData(syncFormDataFromSettings(appSettings));
  }, [appSettings]);

  const canEditSettings = true;

  const handleInstantUpdate = async (name: string, value: any) => {
    if (!canEditSettings) return;

    const saleTypeFields = ['retailEnabled', 'wholesaleEnabled'];
    if (saleTypeFields.includes(name) && value === false) {
      const otherActive = saleTypeFields.filter(f => f !== name && formData[f as keyof typeof formData]);
      if (otherActive.length === 0) {
        sonner.warning('At least one sale type must remain active. Re-enable another sale type before disabling this one.');
        return;
      }
    }

    setFormData((prev: any) => ({ ...prev, [name]: value }));
    setSyncStatus('saving');
    try {
      const { settingsService } = await import('../../lib/services');
      const updatedSettings = {
        ...appSettings,
        ...formData,
        [name]: value,
        taxRate: parseFloat(String(formData.taxRate || 0)),
        invoiceCounter: parseInt(String(formData.invoiceCounter || 1000)),
        receiptFontScale: parseFloat(String(name === 'receiptFontScale' ? value : (formData.receiptFontScale || 1.0))),
        receiptFontWeight: parseInt(String(name === 'receiptFontWeight' ? value : ((formData as any).receiptFontWeight || 600))),
      } as unknown as AppSettings;

      await settingsService.update(updatedSettings as any);
      useSettingsStore.getState().setSettings(updatedSettings as any);
      setSyncStatus('success');

      const displayValue = name === 'storeLogo' ? 'Image Uploaded' : value;
      sonner.toast(`Applied ${name.charAt(0).toUpperCase() + name.slice(1)}: ${displayValue} 🌐`, 'success');
    } catch (error) {
      console.error('Instant update error:', error);
      setSyncStatus('idle');
      sonner.toast('Failed to apply change instantly', 'error');
    } finally {
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!canEditSettings) return;
    const { name, value, type } = e.target;
    const instantFields = [
      'country', 'currency', 'receiptPrinter', 'receiptPaperSize', 'receiptTemplate',
      'interfaceMode', 'theme', 'receiptShowLogo', 'receiptShowFooter', 'receiptShowTax',
      'receiptShowDiscount', 'receiptShowStoreName', 'receiptShowStoreAddress',
      'receiptShowStorePhone', 'receiptShowStoreEmail', 'receiptShowCustomerName',
      'receiptShowCustomerPhone', 'receiptShowNotes', 'receiptShowBarcode', 'receiptShowDeliveryAddress', 'receiptShowQrCode', 'receiptFontBold', 'receiptFontWeight',
      'receiptFontScale'
    ];
    if (instantFields.includes(name)) {
      const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
      handleInstantUpdate(name, val);
      return;
    }
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditSettings) {
      sonner.error('You do not have permission to change settings.');
      return;
    }

    setIsSaving(true);
    setSyncStatus('saving');

    try {
      sonner.loading('Deploying settings changes...');
      const { settingsService } = await import('../../lib/services');

      const updatedSettings = {
        ...appSettings,
        ...formData,
        taxRate: parseFloat(formData.taxRate),
        invoiceCounter: parseInt(formData.invoiceCounter),
        receiptFontScale: parseFloat(formData.receiptFontScale),
        receiptFontWeight: parseInt((formData as any).receiptFontWeight?.toString() || '600'),
      } as unknown as AppSettings;

      await settingsService.update(updatedSettings as any);
      useSettingsStore.getState().setSettings(updatedSettings as any);
      setSyncStatus('success');
      sonner.success('Settings saved to cloud! 🌐');
    } catch (error) {
      console.error('Error saving settings:', error);
      setSyncStatus('idle');
      sonner.error('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
      sonner.close();
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleRepairCounter = async () => {
    if (!canEditSettings) return;
    if (!navigator.onLine) {
      sonner.error('You must be online to repair the counter from cloud data.');
      return;
    }

    try {
      sonner.loading('Scanning all cloud sales for highest invoice number...');
      const { data, error } = await supabase.from('sales').select('invoice_number');
      if (error) throw error;
      let maxCounterNum = parseInt(formData.invoiceCounter);
      if (data && data.length > 0) {
        data.forEach(sale => {
          const val = sale.invoice_number;
          if (typeof val === 'string') {
            const matches = val.match(/\d+$/);
            if (matches) {
              const num = parseInt(matches[0]);
              if (!isNaN(num) && num > maxCounterNum) {
                maxCounterNum = num;
              }
            }
          }
        });
      }
      const nextCounter = maxCounterNum + 1;
      setFormData((prev: any) => ({ ...prev, invoiceCounter: nextCounter.toString() }));
      sonner.success(`Counter repaired! Next invoice will be: ${formData.invoicePrefix}-${nextCounter}`);
    } catch (err: any) {
      console.error('Repair failed:', err);
      sonner.error(`Failed to repair counter: ${err.message}`);
    } finally {
      sonner.close();
    }
  };

  const handleResetCalibration = () => {
    setFormData((prev: any) => ({
      ...prev,
      receiptPaddingTop: 0,
      receiptPaddingBottom: 0,
      receiptPaddingLeft: 0,
      receiptPaddingRight: 0,
      receiptOffsetX: 0,
      receiptHeaderOffsetX: 0,
      receiptFooterOffsetX: 0
    }));
    sonner.toast('Calibration reset! Logo, items, and footer are now centered. 🎯', 'info');
  };

  return {
    formData,
    setFormData,
    handleChange,
    handleInstantUpdate,
    handleSubmit,
    handleRepairCounter,
    handleResetCalibration,
    appSettings,
    profile,
    canEditSettings,
    isOnline,
    play,
    isSaving,
    showReceipt,
    setShowReceipt,
    completedSale,
    setCompletedSale,
    syncStatus,
  };
}
