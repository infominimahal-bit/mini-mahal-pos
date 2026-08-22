import { Modal } from '../../shared/ui/Modal';
import { formatCurrency } from '../../lib/currencies';
import { ChevronRight } from 'lucide-react';

interface DealSizeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  bundles: any[];
  currency: string;
  onSelect: (bundle: any) => void;
}

export function DealSizeSelectorModal({
  isOpen,
  onClose,
  groupName,
  bundles,
  currency,
  onSelect
}: DealSizeSelectorModalProps) {
  
  // Sort bundles by price ascending
  const sortedBundles = [...bundles].sort((a, b) => (a.finalPrice || 0) - (b.finalPrice || 0));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={groupName} maxWidth="md">
      <div className="p-4 sm:p-5 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">
          Select Deal Size / Variant
        </p>
        
        <div className="space-y-3">
          {sortedBundles.map((bundle) => (
            <button
              key={bundle.id}
              onClick={() => {
                onSelect(bundle);
                onClose();
              }}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all text-left group shadow-sm hover:shadow-md"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-sm truncate">
                    {bundle.variantName}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-3">
                <div className="font-black text-violet-600 dark:text-violet-400 text-base">
                  {formatCurrency(bundle.finalPrice, currency)}
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
