// PHASE 16 / 4A / 34 — Central Global Reversal Rule resolver.
//
// Every financial / inventory movement MUST be derived from this single source of
// truth. No scattered `wallet += amount` / `wallet -= amount` guesswork anywhere.
// Inventory and Wallet movements always travel as a PAIRED set computed here.
//
// Rule table (spec Phase 16):
//   SALE                -> Inventory OUT, Wallet IN
//   NEGATIVE-QTY SALE   -> Inventory IN,  Wallet OUT   (mirror of SALE; 4A bug was wallet-half missing)
//   RETURN              -> Inventory IN,  Wallet OUT
//   REFUND              -> Wallet OUT,    Inventory IN (only if physical return)
//   DELETE SALE         -> Inventory IN,  Wallet OUT
//   DELETE RETURN       -> Inventory OUT, Wallet IN
//   REVERSE WALLET IN   -> Wallet OUT
//   REVERSE WALLET OUT  -> Wallet IN

export type MovementDirection = 'IN' | 'OUT';

export type TxnType =
  | 'SALE'
  | 'NEGATIVE_QTY_SALE'
  | 'RETURN'
  | 'REFUND'
  | 'DELETE_SALE'
  | 'DELETE_RETURN'
  | 'REVERSE_WALLET_IN'
  | 'REVERSE_WALLET_OUT';

export interface PairedMovement {
  inventory: MovementDirection;
  wallet: MovementDirection;
}

const RULES: Record<TxnType, PairedMovement> = {
  SALE: { inventory: 'OUT', wallet: 'IN' },
  NEGATIVE_QTY_SALE: { inventory: 'IN', wallet: 'OUT' },
  RETURN: { inventory: 'IN', wallet: 'OUT' },
  REFUND: { inventory: 'IN', wallet: 'OUT' },
  DELETE_SALE: { inventory: 'IN', wallet: 'OUT' },
  DELETE_RETURN: { inventory: 'OUT', wallet: 'IN' },
  REVERSE_WALLET_IN: { inventory: 'IN', wallet: 'OUT' },
  REVERSE_WALLET_OUT: { inventory: 'IN', wallet: 'IN' },
};

/** Resolve the paired inventory + wallet directions for a transaction type. */
export function resolveReversal(type: TxnType): PairedMovement {
  return RULES[type];
}

/** True when the sale's net direction is a return (negative total => mirror). */
export function isReturnDirectionSale(sale: any): boolean {
  return Number(sale?.total || 0) < 0;
}

/** Classify a sale into its resolver type (SALE vs NEGATIVE_QTY_SALE mirror). */
export function saleTxnType(sale: any): TxnType {
  return isReturnDirectionSale(sale) ? 'NEGATIVE_QTY_SALE' : 'SALE';
}

/**
 * Sign for a wallet delta given the intended direction.
 * Positive amount in => +amount, amount out => -amount.
 */
export function walletDelta(amount: number, direction: MovementDirection): number {
  const a = Number(amount || 0);
  return direction === 'OUT' ? -Math.abs(a) : Math.abs(a);
}
