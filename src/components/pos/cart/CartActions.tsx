import { useCartStore } from '../../../stores';
import { FileText } from 'lucide-react';
import { HelpTooltip } from '../../../shared/ui/HelpTooltip';

interface CartActionsProps {
  onSaveDraft: () => void;
  onCheckout: () => void;
}

export function CartActions({ onSaveDraft, onCheckout }: CartActionsProps) {
  const appCart = useCartStore(s => s.cart);
  const isCartEmpty = appCart.length === 0 || appCart.reduce((s, i) => s + Math.abs(i.quantity), 0) === 0;

  return (
    <div className="flex items-center gap-1.5">
      <span className="flex items-center">
        <button
          onClick={onSaveDraft}
          disabled={isCartEmpty}
          title="Save Draft / Hold Order"
          className="p-2.5 rounded-full bg-gray-150/70 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-250 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-40"
        >
          <FileText className="h-3.5 w-3.5" />
        </button>
        <HelpTooltip content="Hold Order / Save Draft: Store this incomplete order to attend to another customer, then resume it anytime from Drafts." />
      </span>
      <span className="flex items-center">
        <button
          onClick={onCheckout}
          disabled={isCartEmpty}
          className="px-5 py-2.5 h-[40px] rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {"Checkout"}
        </button>
        <HelpTooltip content="Proceed to settlement modal to collect cash, split payments, and print/WhatsApp receipt." />
      </span>
    </div>
  );
}
