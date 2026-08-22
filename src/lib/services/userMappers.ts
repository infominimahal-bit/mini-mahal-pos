import {
  User,
} from '../../types';

export const mapUser = (item: any): User => ({
  ...item,
  canEditPrice: item.can_edit_price ?? item.canEditPrice,
  canGiveDiscount: item.can_give_discount ?? item.canGiveDiscount,
  canDeleteSale: item.can_delete_sale ?? item.canDeleteSale,
  canViewProfit: item.can_view_profit ?? item.canViewProfit,
  canManageStock: item.can_manage_stock ?? item.canManageStock,
  canManagePO: item.can_manage_po ?? item.canManagePO,
  canViewRecords: item.can_view_records ?? item.canViewRecords,
  canEditSale: item.can_edit_sale ?? item.canEditSale ?? false,
  lastLogin: item.last_login ? new Date(item.last_login) : (item.lastLogin ? new Date(item.lastLogin) : undefined),
  actionHash: item.action_hash ?? item.actionHash,
  createdAt: item.created_at ? new Date(item.created_at) : new Date(item.createdAt),
  updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(item.updatedAt)
});

export const mapSalesman = (item: any): any => ({
  ...item,
  createdAt: item.created_at || item.createdAt || new Date().toISOString(),
  updatedAt: item.updated_at || item.updatedAt,
});
