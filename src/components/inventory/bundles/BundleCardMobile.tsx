import { Gift, Package, ChevronUp, ChevronDown, ToggleLeft, ToggleRight, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { Button, Badge } from '../../../shared/ui';
import { formatCurrency } from '../../../lib/currencies';
import type { Bundle } from '../../../types';

interface BundleCardMobileProps {
  bundle: Bundle;
  appSettings: any;
  isExpandedLocal: boolean;
  canManage: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  actionMenuOpen: boolean;
  menuUpward: boolean;
  onToggleMenu: (bundleId: string, e: React.MouseEvent) => void;
  onCloseMenu: () => void;
  itemCount: number;
  discAmt: number;
  totalPrice: number;
  finalAmt: number;
  productImages: { bi: any; product: any }[];
}

export function BundleCardMobile({ bundle, appSettings, isExpandedLocal, canManage, onToggleExpand, onEdit, onToggleActive, onDelete, actionMenuOpen, menuUpward, onToggleMenu, onCloseMenu, itemCount, discAmt, totalPrice, finalAmt, productImages }: BundleCardMobileProps) {
  return (
    <div className="sm:hidden p-4 space-y-1.5">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${bundle.active ? 'bg-primary/10' : 'bg-gray-100 dark:bg-white/5'}`}>
          <Gift className={`h-5 w-5 ${bundle.active ? 'text-primary' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-black text-gray-900 dark:text-white uppercase text-sm line-clamp-2 leading-tight">{bundle.name}</p>
            {!bundle.active && <Badge tone="neutral" className="!bg-gray-200 dark:!bg-white/10 !text-gray-500 !px-1.5 !py-0.5 !rounded !text-[8px] shrink-0">{"Inactive"}</Badge>}
            {(bundle.name?.length < 3 || (bundle.discountType === 'percentage' && bundle.discountValue > 100) || discAmt >= totalPrice) && (
              <Badge tone="danger" variant="solid" className="!bg-red-500 !px-1.5 !py-0.5 !rounded !text-[8px] shrink-0" title={"This bundle has invalid pricing — edit or delete it"}>{"Invalid"}</Badge>
            )}
          </div>
        </div>
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            onClick={(e) => onToggleMenu(bundle.id, e)}
            className="!min-h-0 !p-2 !rounded-lg !bg-transparent hover:!bg-gray-100 dark:hover:!bg-white/5"
            icon={<MoreHorizontal className="h-4 w-4 text-gray-500" />}
          />
          {actionMenuOpen && (
            <div className={`absolute right-0 ${menuUpward ? 'bottom-full mb-1' : 'top-full mt-1'} bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-[100] p-1 min-w-[160px]`} onClick={onCloseMenu}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => { onToggleExpand(); onCloseMenu(); }}
                className="w-full !justify-start !min-h-0 !px-3 !py-2.5 !rounded-lg !bg-transparent hover:!bg-gray-50 dark:hover:!bg-white/5 !text-[11px] !font-black !text-gray-700 dark:!text-gray-300"
              >
                {isExpandedLocal ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {isExpandedLocal ? "Collapse" : "Expand"}
              </Button>
              {canManage && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { onEdit(); onCloseMenu(); }}
                    className="w-full !justify-start !min-h-0 !px-3 !py-2.5 !rounded-lg !bg-transparent hover:!bg-blue-50 dark:hover:!bg-blue-500/10 !text-[11px] !font-black !text-blue-500"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    {"Edit"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { onToggleActive(); onCloseMenu(); }}
                    className="w-full !justify-start !min-h-0 !px-3 !py-2.5 !rounded-lg !bg-transparent hover:!bg-gray-50 dark:hover:!bg-white/5 !text-[11px] !font-black !text-gray-700 dark:!text-gray-300"
                  >
                    {bundle.active ? <ToggleRight className="h-3.5 w-3.5 text-primary" /> : <ToggleLeft className="h-3.5 w-3.5 text-gray-400" />}
                    {bundle.active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { onDelete(); onCloseMenu(); }}
                    className="w-full !justify-start !min-h-0 !px-3 !py-2.5 !rounded-lg !bg-transparent hover:!bg-red-50 dark:hover:!bg-red-500/10 !text-[11px] !font-black !text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {"Delete"}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 pl-[52px]">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-[10px] text-gray-500 whitespace-nowrap">
            {"{count} products".replace('{count}', String(itemCount))}
          </span>
          <span className="text-[10px] font-black text-red-500 whitespace-nowrap">
            {bundle.discountType === 'percentage' && discAmt > 0 ? `-${bundle.discountValue}%` : discAmt > 0 ? `-${formatCurrency(discAmt, appSettings.currency)}` : ''}
          </span>
          <span className="text-[10px] font-black text-primary whitespace-nowrap">{formatCurrency(finalAmt, appSettings.currency)}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {productImages.slice(0, 3).map(({ bi, product }, idx) => (
            <div
              key={bi.id || idx}
              className="h-8 w-8 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/5 shrink-0 border border-gray-200 dark:border-white/10"
              title={`${product.name} (x${bi.quantity})`}
            >
              {product.image ? (
                <img src={product.image} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-primary/10">
                  <Package className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
            </div>
          ))}
          {productImages.length > 3 && (
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary dark:text-emerald-400 text-[10px] font-black border border-primary/20 shrink-0">
              +{productImages.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
