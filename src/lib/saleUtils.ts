export const isSaleDraft = (sale: { notes?: string | null; status?: string }): boolean =>
  !!sale.notes?.includes('DRAFT_SALE');
// status='pending' = credit sale (real, stock taken). NOT a draft.
