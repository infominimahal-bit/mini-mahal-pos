import React from 'react';
import { AppSettings } from '../../types';

export interface RenderReceiptLayoutProps {
  template: string;
  settings: AppSettings;
  bodyStyle: React.CSSProperties;
  fs: any;
  baseWeight: number;
  RECEIPT_WATERMARK: React.ReactNode;
  metaBlock: React.ReactNode;
  defaultItemsTable: React.ReactNode;
  totalsBlock: React.ReactNode;
  paymentBlock: React.ReactNode;
  notesBlock: React.ReactNode;
  footerBlock: React.ReactNode;
  storeNameBlock: React.ReactNode;
  storeInfoBlock: React.ReactNode;
  renderLogo: (style: React.CSSProperties) => React.ReactNode;
  total: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  taxLabel: string;
  is58mm: boolean;
  previewWrap: (content: React.ReactNode) => React.ReactNode;
  TwoCol: any;
  itemRows: any[];
}
