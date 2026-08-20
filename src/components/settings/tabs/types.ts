import type { ChangeEvent, Dispatch, SetStateAction } from 'react';

export interface SettingsTabProps {
  formData: any;
  setFormData: Dispatch<SetStateAction<any>>;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleInstantUpdate: (name: string, value: any) => Promise<void>;
  handleRepairCounter: () => Promise<void>;
  handleResetCalibration: () => void;
  appSettings: any;
  t: (key: string, fallback: string) => string;
  profile?: any;
  canEditSettings: boolean;
  isOnline: boolean;
  play: (sound: string) => void;
  setCompletedSale: Dispatch<SetStateAction<any>>;
  setShowReceipt: Dispatch<SetStateAction<boolean>>;
}
