export interface Salesman {
  id: string;
  name: string;
  phone?: string;
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier' | 'salesman';
  permissions: string[];
  canEditPrice: boolean;
  canGiveDiscount: boolean;
  canDeleteSale: boolean;
  canViewProfit: boolean;
  canManageStock: boolean;
  canManagePO: boolean;
  canViewRecords: boolean;
  canEditSale: boolean;
  active: boolean;
  lastLogin?: Date;
  avatar?: string;
  offlineHash?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}