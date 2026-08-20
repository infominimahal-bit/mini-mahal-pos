import { ExtraTopping } from './product';

export interface BundleItem {
  id: string;
  bundleId: string;
  productId: string;
  quantity: number;   // How many units of this product are in the bundle
  createdAt?: Date;
}

export interface BundleSlotOption {
  id: string;
  slotId: string;
  productId: string;
  sortOrder?: number;
  createdAt?: Date;
}

export interface BundleSlot {
  id: string;
  bundleId: string;
  name: string;
  requiredQuantity: number;
  orderIndex: number;
  options?: BundleSlotOption[];
  createdAt?: Date;
}

export type ScheduleType = 'always' | 'scheduled';

export interface Bundle {
  id: string;
  name: string;
  description?: string;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  active: boolean;
  scheduleType?: ScheduleType;
  startDate?: string;
  endDate?: string;
  repeatDays?: string[];
  startTime?: string;
  endTime?: string;
  hideItemPrices?: boolean;
  isCombo?: boolean;
  dealCategory?: 'pizza' | 'burger' | 'beverage' | 'single_item';
  overridePrice?: number;
  items?: BundleItem[];
  slots?: BundleSlot[];
  highlightTag?: 'sunday' | 'crown';
  badgeEnabled?: boolean;
  badgeText?: string;
  badgeIcon?: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
  image?: string;
  extraToppings?: ExtraTopping[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BundleSlotTopping {
  id: string;
  slotId: string;
  toppingId: string;
}

export interface ExtraTopping {
  id: string;
  name: string;
  priceSmall: number;
  priceMedium: number;
  priceLarge: number;
  active: boolean;
}