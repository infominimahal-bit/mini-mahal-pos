import { getAllBundles } from './bundleGetAll';
import { createBundle } from './bundleCreate';
import { updateBundle } from './bundleUpdate';
import { deleteBundle } from './bundleDelete';
import { getBundleCartItems } from './bundleCart';

export { mapBundle } from './bundleMappers';
export * from './toppingsService';
export * from './productAddonsService';
export * from './productToppingsService';

function _isNetworkError(e: any): boolean {
  if (!navigator.onLine) return true;
  const msg = (e?.message || e?.error_description || '').toLowerCase();
  return !e?.code || // No status code = didn't reach server
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('dns') ||
    msg.includes('eai_again') ||
    msg.includes('enotfound') ||
    msg.includes('getaddrinfo') ||
    msg.includes('failed, reason') ||
    msg.includes('load resource') ||
    msg.includes('quic') ||
    msg.includes('disconnected') ||
    msg.includes('timeout') ||
    msg.includes('abort');
}

export const bundlesService = {
  getAll: getAllBundles,
  create: createBundle,
  update: updateBundle,
  delete: deleteBundle,
  getBundleCartItems: getBundleCartItems,
};
