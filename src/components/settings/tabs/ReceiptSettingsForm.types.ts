import type { SettingsTabProps } from './types';

export interface ReceiptSettingsFormProps {
  formData: SettingsTabProps['formData'];
  setFormData: SettingsTabProps['setFormData'];
  handleChange: SettingsTabProps['handleChange'];
  handleInstantUpdate: SettingsTabProps['handleInstantUpdate'];
  handleResetCalibration: SettingsTabProps['handleResetCalibration'];
  canEditSettings: boolean;
}
