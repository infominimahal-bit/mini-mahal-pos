export interface PaymentMode {
  id: string;
  name: string;
  icon: string;
  balance: number;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  color?: string;
  updatedAt: Date;
}

export interface PaymentMovement {
  id: string;
  modeId: string;
  delta: number;
  referenceId?: string;
  referenceType?: string;
  note?: string;
  createdAt: Date;
}
