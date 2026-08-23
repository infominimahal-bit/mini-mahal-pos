import { useState } from 'react';
import { useSettingsStore } from '../../../stores';
import { settingsService } from '../../../lib/services';
import { sonner } from '../../../lib/sonner';
import { AppSettings } from '../../../types';
import type { PaperSize } from './BarcodeCard';

export function useBarcodeSettings() {
  const appSettings = useSettingsStore(s => s.settings);

  const [paperSize, setPaperSize] = useState<PaperSize>((appSettings.barcodePaperSize as PaperSize) || 'A4');
  const [a4Columns, setA4Columns] = useState<number>(appSettings.barcodeA4Columns || 3);
  const [a4Rows, setA4Rows] = useState<number>(appSettings.barcodeA4Rows || 10);
  const [showPrice, setShowPrice] = useState(appSettings.barcodeShowPrice ?? true);
  const [showName, setShowName] = useState(appSettings.barcodeShowName ?? true);
  const [showSku, setShowSku] = useState(appSettings.barcodeShowSku ?? false);
  const [showCategory, setShowCategory] = useState(appSettings.barcodeShowCategory ?? false);
  const [barcodeScale, setBarcodeScale] = useState<number>(appSettings.barcodeScale || 1.0);
  const [barcodeHeight, setBarcodeHeight] = useState<number>(appSettings.barcodeHeight || 30);
  const [labelPadding, setLabelPadding] = useState<number>(appSettings.barcodePadding || 8);
  const [labelBorder, setLabelBorder] = useState(appSettings.barcodeBorder ?? true);
  const [showBarcode, setShowBarcode] = useState<boolean>(appSettings.barcodeShowBarcode ?? true);
  const [showQr, setShowQr] = useState<boolean>(appSettings.barcodeShowQr ?? false);
  const [qrSize, setQrSize] = useState<number>(appSettings.barcodeQrSize || 30);
  const [nameLines, setNameLines] = useState<1 | 2>((appSettings.barcodeNameLines as 1 | 2) || 1);
  const [barcodeFontSize, setBarcodeFontSize] = useState<number>(appSettings.barcodeFontSize || 8);
  const [contentScale, setContentScale] = useState<number>(appSettings.barcodeContentScale || 1.0);
  const [marginX, setMarginX] = useState<number>(appSettings.barcodeMarginX || 0);
  const [marginY, setMarginY] = useState<number>(appSettings.barcodeMarginY || 0);
  const [gapX, setGapX] = useState<number>(appSettings.barcodeGapX || 0);
  const [gapY, setGapY] = useState<number>(appSettings.barcodeGapY || 0);
  const [barcodeBarWidth, setBarcodeBarWidth] = useState<number>(appSettings.barcodeBarWidth || 0.8);
  const [barcodeZoom, setBarcodeZoom] = useState<number>(1.0);
  const [isSaving, setIsSaving] = useState(false);

  const saveAsDefault = async () => {
    try {
      setIsSaving(true);
      const s: Partial<AppSettings> = {
        barcodePaperSize: paperSize, barcodeA4Columns: a4Columns, barcodeA4Rows: a4Rows,
        barcodeShowPrice: showPrice, barcodeShowName: showName, barcodeShowSku: showSku,
        barcodeShowCategory: showCategory, barcodeScale, barcodeHeight,
        barcodePadding: labelPadding, barcodeBorder: labelBorder, 
        barcodeShowBarcode: showBarcode, barcodeShowQr: showQr, barcodeQrSize: qrSize,
        barcodeNameLines: nameLines, barcodeFontSize, barcodeContentScale: contentScale,
        barcodeMarginX: marginX, barcodeMarginY: marginY,
        barcodeGapX: gapX, barcodeGapY: gapY, barcodeBarWidth: barcodeBarWidth,
      };
      await settingsService.update(s);
      const prev = JSON.parse(localStorage.getItem('pos_advanced_settings') || '{}');
      localStorage.setItem('pos_advanced_settings', JSON.stringify({ ...prev, ...s }));
      useSettingsStore.getState().setSettings(s);
      sonner.success('Settings saved as default!');
    } catch { sonner.error('Failed to save settings'); }
    finally { setIsSaving(false); }
  };

  return {
    paperSize, setPaperSize,
    a4Columns, setA4Columns,
    a4Rows, setA4Rows,
    showPrice, setShowPrice,
    showName, setShowName,
    showSku, setShowSku,
    showCategory, setShowCategory,
    barcodeScale, setBarcodeScale,
    barcodeHeight, setBarcodeHeight,
    labelPadding, setLabelPadding,
    labelBorder, setLabelBorder,
    showBarcode, setShowBarcode,
    showQr, setShowQr,
    qrSize, setQrSize,
    nameLines, setNameLines,
    barcodeFontSize, setBarcodeFontSize,
    contentScale, setContentScale,
    marginX, setMarginX,
    marginY, setMarginY,
    gapX, setGapX,
    gapY, setGapY,
    barcodeBarWidth, setBarcodeBarWidth,
    barcodeZoom, setBarcodeZoom,
    isSaving, saveAsDefault,
    appSettings
  };
}
