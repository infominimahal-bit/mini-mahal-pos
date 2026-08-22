import { supabase, adminUserAction } from '../supabase';
import {
  localDb,
  generateId,
} from '../localDb';
import { cloudWrite } from '../cloudWrite';
import {
  Topping,
} from '../../types';

export const mapTopping = (row: any): Topping => ({
  id: row.id,
  name: row.name,
  priceSmall: parseFloat(row.price_small) || 0,
  priceMedium: parseFloat(row.price_medium) || 0,
  priceLarge: parseFloat(row.price_large) || 0,
  createdAt: row.created_at ? new Date(row.created_at) : new Date(),
});

export const toRemoteTopping = (topping: Partial<Topping>): any => ({
  id: topping.id,
  name: topping.name,
  price_small: topping.priceSmall,
  price_medium: topping.priceMedium,
  price_large: topping.priceLarge,
});

export const toppingsService = {
  async fetchAll(): Promise<Topping[]> {
    const { data, error } = await supabase
      .from('toppings')
      .select('*')
      .order('name');
    if (error) throw error;
    return (data || []).map(mapTopping);
  },

  async create(topping: Partial<Topping>): Promise<Topping> {
    const id = (topping as any).id || generateId();
    const remote = { ...toRemoteTopping(topping), id };
    await cloudWrite('toppings', 'create', id, remote);
    await localDb.toppings.put({ ...(topping as any), id } as any);
    return mapTopping(remote as any);
  },

  async update(id: string, topping: Partial<Topping>): Promise<Topping> {
    const remote = { ...toRemoteTopping(topping), id };
    await cloudWrite('toppings', 'update', id, remote);
    await localDb.toppings.update(id, topping as any);
    return mapTopping({ ...remote, id } as any);
  },

  async remove(id: string): Promise<void> {
    await cloudWrite('toppings', 'delete', id, {});
    await localDb.toppings.delete(id);
  },
};
