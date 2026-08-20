export function computeQuickAmounts(finalTotal: number): number[] {
  if (finalTotal <= 0) return [];
  const amounts = new Set<number>();

  // Always include exact total
  amounts.add(Math.ceil(finalTotal));

  if (finalTotal < 500) {
    amounts.add(Math.ceil(finalTotal / 50) * 50);
    amounts.add(Math.ceil(finalTotal / 100) * 100);
    amounts.add(500);
  } else if (finalTotal < 1000) {
    amounts.add(Math.ceil(finalTotal / 100) * 100);
    amounts.add(1000);
    amounts.add(1500);
  } else if (finalTotal < 5000) {
    amounts.add(Math.ceil(finalTotal / 500) * 500);
    amounts.add(Math.ceil(finalTotal / 1000) * 1000);
    if (finalTotal < 4500) amounts.add(5000);
  } else {
    amounts.add(Math.ceil(finalTotal / 1000) * 1000);
    const next5k = Math.ceil(finalTotal / 5000) * 5000;
    amounts.add(next5k === Math.ceil(finalTotal) ? next5k + 5000 : next5k);
    amounts.add(Math.ceil(finalTotal / 5000) * 5000 + 5000);
  }

  return Array.from(amounts)
    .filter(a => a >= finalTotal)
    .sort((a, b) => a - b)
    .slice(0, 3);
}
