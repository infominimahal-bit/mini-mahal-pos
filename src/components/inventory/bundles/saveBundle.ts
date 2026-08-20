import { useAppStore } from '../../../stores';
import { bundlesService } from '../../../lib/services';
import { sonner } from '../../../lib/sonner';
import type { Bundle, Product } from '../../../types';
import type { BundleForm } from './formTypes';

interface SaveBundleArgs {
  form: BundleForm;
  editingBundle: Bundle | null;
  products: Product[];
  setSaving: (v: boolean) => void;
  onClose: () => void;
  t: (key: string, fallback: string) => string;
}

export async function saveBundle({ form, editingBundle, products, setSaving, onClose, t }: SaveBundleArgs): Promise<void> {
  if (!form.name || form.name.trim().length < 3) return sonner.error(t('bundle_name_too_short', 'Bundle name must be at least 3 characters'));

  if (form.isCombo) {
    if (form.slots.length === 0) return sonner.error(t('bundle_min_slots', 'Deal must have at least one slot'));
    for (const slot of form.slots) {
      if (!slot.name.trim()) return sonner.error(t('bundle_slot_name_req', 'All slots must have a name'));
      if (slot.options.length < slot.requiredQuantity) return sonner.error(`Slot "${slot.name}" requires at least ${slot.requiredQuantity} options, but has ${slot.options.length}`);
    }
  } else {
    if (form.items.length < 1) return sonner.error(t('bundle_min_products', 'Bundle must contain at least 1 product'));
  }

  const bundleTotal = form.items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  const discountAmount = form.discountType === 'percentage'
    ? (bundleTotal * form.discountValue) / 100
    : Math.min(form.discountValue, bundleTotal);

  if (form.discountType === 'percentage' && form.discountValue > 100) return sonner.error(t('bundle_discount_percent_max', 'Percentage discount cannot exceed 100%'));
  if (!form.isCombo && bundleTotal > 0 && discountAmount >= bundleTotal) return sonner.error(t('bundle_discount_exceeds_total', 'Discount cannot equal or exceed the total price'));
  setSaving(true);
  try {
    const wasOffline = !navigator.onLine;
    const slotsPayload = form.isCombo ? form.slots.map((s, idx) => ({ name: s.name, requiredQuantity: s.requiredQuantity, orderIndex: idx, options: s.options })) : undefined;
    const itemsPayload = form.isCombo ? undefined : form.items;

    if (editingBundle) {
      await bundlesService.update(editingBundle.id, {
        name: form.name,
        description: form.description,
        image: form.image || null,
        discountValue: form.discountValue,
        discountType: form.discountType,
        hideItemPrices: form.hideItemPrices,
        badgeEnabled: form.badgeEnabled,
        badgeText: form.badgeText || undefined,
        badgeIcon: form.badgeIcon || undefined,
        badgeBgColor: form.badgeBgColor || undefined,
        badgeTextColor: form.badgeTextColor || undefined,
        items: itemsPayload,
        slots: slotsPayload,
        isCombo: form.isCombo,
        scheduleType: form.scheduleType,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        repeatDays: form.repeatDays.length > 0 ? form.repeatDays : null,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        extraToppings: form.extraToppings.filter(t => t.active),
      });
      useAppStore.getState().updateBundle({
          ...editingBundle,
          name: form.name,
          description: form.description,
          image: form.image || undefined,
        discountValue: form.discountValue,
        discountType: form.discountType,
        overridePrice: form.overridePrice || undefined,
          hideItemPrices: form.hideItemPrices,
          badgeEnabled: form.badgeEnabled,
          badgeText: form.badgeText || undefined,
          badgeIcon: form.badgeIcon || undefined,
          badgeBgColor: form.badgeBgColor || undefined,
          badgeTextColor: form.badgeTextColor || undefined,
          isCombo: form.isCombo,
          scheduleType: form.scheduleType,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          repeatDays: form.repeatDays.length > 0 ? form.repeatDays : undefined,
          startTime: form.startTime || undefined,
          endTime: form.endTime || undefined,
          extraToppings: form.extraToppings.filter(t => t.active),
          items: (itemsPayload || []).map((i, idx) => ({
            id: `${editingBundle.id}-${idx}`,
            bundleId: editingBundle.id,
            productId: i.productId,
            quantity: i.quantity,
          })),
          slots: (slotsPayload || []).map((s) => ({
            id: Date.now().toString() + Math.random().toString(),
            bundleId: editingBundle.id,
            name: s.name,
            requiredQuantity: s.requiredQuantity,
            orderIndex: s.orderIndex,
            options: s.options.map(o => ({
              id: Date.now().toString() + Math.random().toString(),
              slotId: '',
              productId: o.productId
            }))
          })),
          updatedAt: new Date(),
        },);
      sonner.success(wasOffline
        ? t('bundle_updated_offline', 'Bundle updated — will sync when online')
        : t('bundle_updated', 'Bundle updated successfully!'));
    } else {
      const created = await bundlesService.create({
        name: form.name,
        description: form.description,
        image: form.image || null,
        discountValue: form.discountValue,
        discountType: form.discountType,
        overridePrice: form.overridePrice || undefined,
        hideItemPrices: form.hideItemPrices,
        badgeEnabled: form.badgeEnabled,
        badgeText: form.badgeText || undefined,
        badgeIcon: form.badgeIcon || undefined,
        badgeBgColor: form.badgeBgColor || undefined,
        badgeTextColor: form.badgeTextColor || undefined,
        items: itemsPayload,
        slots: slotsPayload,
        isCombo: form.isCombo,
        scheduleType: form.scheduleType,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        repeatDays: form.repeatDays.length > 0 ? form.repeatDays : null,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        extraToppings: form.extraToppings.filter(t => t.active),
      });
      useAppStore.getState().addBundle(created);
      sonner.success(wasOffline
        ? t('bundle_created_offline', 'Bundle saved — will sync when online')
        : t('bundle_created', 'Bundle created successfully!'));
    }
    onClose();
  } catch (err: any) {
    sonner.error(err.message || t('bundle_save_error', 'Error saving bundle'));
  } finally {
    setSaving(false);
  }
}
