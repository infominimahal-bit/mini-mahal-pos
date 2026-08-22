import { Gift, ChevronUp, ChevronDown, ToggleLeft, ToggleRight, Edit, Trash2 } from 'lucide-react';
import { Button, Badge } from '../../../shared/ui';
import { formatCurrency } from '../../../lib/currencies';
import type { Bundle } from '../../../types';

interface BundleCardDesktopProps {
  bundle: Bundle;
  appSettings: any;
  isExpandedLocal: boolean;
  canManage: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  itemCount: number;
  discAmt: number;
  totalPrice: number;
  finalAmt: number;
}

export function BundleCardDesktop({ bundle, appSettings, isExpandedLocal, canManage, onToggleExpand, onEdit, onToggleActive, onDelete, itemCount, discAmt, totalPrice, finalAmt }: BundleCardDesktopProps) {
  return (
    <div className="hidden sm:flex items-center gap-3 p-4">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${bundle.active ? 'bg-primary/10' : 'bg-gray-100 dark:bg-white/5'}`}>
        <Gift className={`h-5 w-5 ${bundle.active ? 'text-primary' : 'text-gray-400'}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-black text-gray-900 dark:text-white uppercase text-sm truncate">{bundle.name}</p>
          {!bundle.active && <Badge tone="neutral" className="!bg-gray-200 dark:!bg-white/10 !text-gray-500 !px-1.5 !py-0.5 !rounded !text-[8px]">{"Inactive"}</Badge>}
          {(bundle.name?.length < 3 || (bundle.discountType === 'percentage' && bundle.discountValue > 100) || discAmt >= totalPrice) && (
            <Badge tone="danger" variant="solid" className="!bg-red-500 !px-1.5 !py-0.5 !rounded !text-[8px]" title={"This bundle has invalid pricing — edit or delete it"}>{"Invalid"}</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] text-gray-500">
            {"{count} products".replace('{count}', String(itemCount))}
          </span>
          <span className="text-[10px] font-black text-red-500">
            {bundle.discountType === 'percentage' && discAmt > 0 ? `-${bundle.discountValue}%` : discAmt > 0 ? `-${formatCurrency(discAmt, appSettings.currency)}` : ''}
          </span>
          <span className="text-[10px] font-black text-primary">{formatCurrency(finalAmt, appSettings.currency)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          onClick={onToggleExpand}
          className="!min-h-0 !p-2 !rounded-lg !bg-transparent hover:!bg-gray-100 dark:hover:!bg-white/5"
          icon={isExpandedLocal ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        />
        {canManage && (
          <>
            <Button type="button" variant="ghost" onClick={onToggleActive} className="!min-h-0 !p-2 !rounded-lg !bg-transparent hover:!bg-gray-100 dark:hover:!bg-white/5" title={bundle.active ? "Disable" : "Enable"} icon={bundle.active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />} />
            <Button type="button" variant="ghost" onClick={onEdit} className="!min-h-0 !p-2 !rounded-lg !bg-transparent !text-blue-500 hover:!bg-blue-50 dark:hover:!bg-blue-500/10" icon={<Edit className="h-4 w-4" />} />
            <Button type="button" variant="ghost" onClick={onDelete} className="!min-h-0 !p-2 !rounded-lg !bg-transparent !text-red-500 hover:!bg-red-50 dark:hover:!bg-red-500/10" icon={<Trash2 className="h-4 w-4" />} />
          </>
        )}
      </div>
    </div>
  );
}
