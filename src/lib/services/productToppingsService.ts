import { supabase } from '../supabase';
import { cloudWrite } from '../cloudWrite';

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
    // Cloud-direct: replace the join rows for this product atomically enough for
    // our needs — delete the old set, then upsert the new set. Throws on failure.
    await cloudWrite('product_toppings', 'delete', productId, {});
    if (toppingIds.length === 0) return;
    const rows = toppingIds.map(toppingId => ({ product_id: productId, topping_id: toppingId }));
    await cloudWrite('product_toppings', 'create', productId, rows);
  },
};
