export function buildExpensePayload(
  formData: {
    description: string;
    amount: string;
    category: string;
    date: string;
    paymentMethod: 'cash' | 'card' | 'online';
    storeType: 'retail' | 'wholesale' | undefined;
    notes: string;
  },
  isManualOverride: boolean,
  appCurrentUser: any,
  selectedSupplierId: string
) {
  const amount = parseFloat(formData.amount);
  const exactDate = new Date();
  const selectedParts = formData.date.split('-');
  exactDate.setFullYear(parseInt(selectedParts[0]), parseInt(selectedParts[1]) - 1, parseInt(selectedParts[2]));

  const overrideBy = isManualOverride ? (appCurrentUser?.id || appCurrentUser?.username) : undefined;

  return {
    description: formData.description,
    amount,
    category: formData.category,
    date: exactDate,
    paymentMethod: formData.paymentMethod,
    storeType: formData.storeType,
    notes: formData.notes,
    isManualOverride,
    overrideBy,
    supplierId: formData.category === 'Supplies' ? selectedSupplierId : undefined,
  };
}
