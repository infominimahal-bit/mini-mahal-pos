import { DetailCtx } from './detailContext';
import { performAdjustment } from './detailAdjustment';
import { performQuickRestock } from './detailRestock';
import { performSave } from './detailSave';
import { performRecalc } from './detailRecalc';
import { generateBarcode, generateSku } from './detailGenerators';

export function createDetailHandlers(ctx: DetailCtx) {
  const handleAdjustment = () => performAdjustment(ctx);
  const handleQuickRestock = () => performQuickRestock(ctx);
  const handleSave = () => performSave(ctx);
  const handleRecalc = () => performRecalc(ctx);
  const generateBarcodeFn = () => generateBarcode(ctx);
  const generateSkuFn = () => generateSku(ctx);

  return { handleAdjustment, handleQuickRestock, handleSave, handleRecalc, generateBarcode: generateBarcodeFn, generateSku: generateSkuFn };
}
