import React from 'react';
import { ShoppingCart, Truck, User as UserIcon } from 'lucide-react';
import { PurchaseRecord } from '../../types';
import { formatCurrency } from '../../lib/currencies';

interface PurchaseHistorySummaryProps {
  filteredRecords: PurchaseRecord[];
  supplierFilter: string;
  currency: string;
}

export const PurchaseHistorySummary = React.memo(function PurchaseHistorySummary({
  filteredRecords,
  supplierFilter,
  currency,
}: PurchaseHistorySummaryProps) {
  const procurementOnly = filteredRecords.filter(r =>
    r.quantity > 0 &&
    !['Sale', 'Return'].includes(r.type) &&
    !(r.supplier?.toUpperCase() || '').includes('RETURN') &&
    !(r.supplier?.toUpperCase() || '').includes('SALE')
  );

  const totalPurchaseValue = procurementOnly.reduce((sum, r) => sum + ((r.quantity || 0) * (r.costPrice || 0)), 0);
  const totalItemsCount = procurementOnly.reduce((sum, r) => sum + r.quantity, 0);

  const supplierCounts = procurementOnly.reduce((acc: any, r) => {
    if (!r.supplier) return acc;
    acc[r.supplier] = (acc[r.supplier] || 0) + 1;
    return acc;
  }, {});

  const sortedSuppliers = Object.entries(supplierCounts).sort((a: any, b: any) => b[1] - a[1]);
  const mainSupplierName = supplierFilter !== 'All'
    ? supplierFilter
    : (sortedSuppliers[0]?.[0] || 'Direct Entry');

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      <div className="stat-card bg-gradient-to-br from-emerald-500 to-teal-600 group">
        <div className="stat-card-inner">
          <p className="stat-card-label">{"Total Procurement"}</p>
          <h3 className="stat-card-value">{formatCurrency(totalPurchaseValue, currency)}</h3>
          <p className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">{"Active Period"}</p>
        </div>
        <ShoppingCart className="stat-card-icon" />
      </div>

      <div className="stat-card bg-gradient-to-br from-blue-600 to-indigo-700 group">
        <div className="stat-card-inner">
          <p className="stat-card-label">{"Total Stock In"}</p>
          <h3 className="stat-card-value">{totalItemsCount.toLocaleString()}</h3>
          <p className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">{filteredRecords.length} {"Entries"}</p>
        </div>
        <Truck className="stat-card-icon" />
      </div>

      <div className="stat-card bg-gradient-to-br from-orange-500 to-amber-600 group col-span-2 md:col-span-1">
        <div className="stat-card-inner">
          <p className="stat-card-label">{"Main Supplier"}</p>
          <h3 className="stat-card-value">{mainSupplierName}</h3>
          <p className="text-[7px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">{Object.keys(supplierCounts).length} {"Partners"}</p>
        </div>
        <UserIcon className="stat-card-icon" />
      </div>
    </div>
  );
});
