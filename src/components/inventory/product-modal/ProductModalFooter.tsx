import { Package } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { Product } from '../../../types';

interface ProductModalFooterProps {
  product: Product | null;
  onClose: () => void;
  onSubmit: () => void;
}

export function ProductModalFooter({ product, onClose, onSubmit }: ProductModalFooterProps) {
  return (
    <div className="flex items-center justify-end gap-2 sm:gap-3 w-full">
      <Button
        type="button"
        variant="danger"
        onClick={onClose}
        className="!bg-transparent !border-rose-200 dark:!border-rose-900/30 !text-[#ff4b6e] hover:!bg-rose-50 dark:hover:!bg-rose-500/10 hover:!opacity-100 !shadow-none !px-4 sm:!px-6 !py-2.5 sm:!py-3.5 !text-[9px] sm:!text-[10px] !rounded-2xl !shrink-0 !min-h-0"
      >
        {"discard_upper"}
      </Button>
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={onSubmit}
        className="flex-1 sm:flex-none sm:!min-w-[240px] hover:!shadow-emerald-500/30 !py-2.5 sm:!py-3.5 !text-[9px] sm:!text-[11px]"
        icon={<Package className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />}
      >
        <span className="leading-none mt-[1px]">
          {product ? "commit_changes" : "register_product"}
        </span>
      </Button>
    </div>
  );
}
