import { supabase } from '../supabase';
import {
  queueOp,
} from '../localDb';

export const productToppingsService = {
  async getByProduct(productId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('product_toppings')
      .select('topping_id')
      .eq('product_id', productId);
    if (error) throw error;
    return (data || []).map(r => r.topping_id);
  },

  async setByProduct(productId: string, toppingIds: string[]): Promise<void> {
    // OFFLINE-FIRST: queue the delete (by product_id) + re-insert join rows (never direct supabase write).
    await queueOp('product_toppings', 'delete', productId, {});
    if (toppingIds.length === 0) return;
    for (const toppingId of toppingIds) {
      const row = { product_id: productId, topping_id: toppingId };
      await queueOp('product_toppings', 'create', `${productId}:${toppingId}`, row);
    }
  },
};
