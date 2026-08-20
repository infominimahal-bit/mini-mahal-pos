import React, { useState, useEffect, useMemo } from 'react';
import { useInventoryStore } from '../../../stores';
import { suppliersService } from '../../../lib/services';
import { SupplierReportRow } from './SuppliersReport.utils';

export function useSuppliersReportData() {
  const appSuppliers = useInventoryStore(s => s.suppliers);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SupplierReportRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedLedger, setExpandedLedger] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'billed' | 'paid'>('balance');
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const supplierRows: SupplierReportRow[] = [];
        for (const supplier of appSuppliers) {
          const balance = await suppliersService.getBalance(supplier.id);
          const ledger = await suppliersService.getLedger(supplier.id, 9999, 0, false);

          let totalBilled = 0;
          let totalPaid = 0;
          ledger.forEach((tx: any) => {
            totalBilled += Number(tx.credit) || 0;
            totalPaid += Number(tx.debit) || 0;
          });

          supplierRows.push({
            supplier,
            totalBilled,
            totalPaid,
            balance,
            transactionCount: ledger.length,
          });
        }
        setRows(supplierRows);
      } catch (err) {
        console.error('Failed to load supplier report data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [appSuppliers]);

  const handleExpand = async (supplierId: string) => {
    if (expandedId === supplierId) {
      setExpandedId(null);
      setExpandedLedger([]);
      return;
    }
    setExpandedId(supplierId);
    const ledger = await suppliersService.getLedger(supplierId, 50, 0, false);
    setExpandedLedger(ledger);
  };

  const filteredRows = useMemo(() => {
    let result = rows;
    if (searchTerm) {
      result = result.filter(r =>
        r.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.supplier.name.localeCompare(b.supplier.name);
      else if (sortBy === 'balance') cmp = a.balance - b.balance;
      else if (sortBy === 'billed') cmp = a.totalBilled - b.totalBilled;
      else if (sortBy === 'paid') cmp = a.totalPaid - b.totalPaid;
      return sortDesc ? -cmp : cmp;
    });
    return result;
  }, [rows, searchTerm, sortBy, sortDesc]);

  const exportRows = useMemo(() => filteredRows.map(r => ({
    name: r.supplier.name,
    phone: r.supplier.phone || '',
    totalBilled: r.totalBilled,
    totalPaid: r.totalPaid,
    balance: r.balance,
    transactionCount: r.transactionCount,
  })), [filteredRows]);

  const totals = useMemo(() => ({
    billed: rows.reduce((s, r) => s + r.totalBilled, 0),
    paid: rows.reduce((s, r) => s + r.totalPaid, 0),
    outstanding: rows.reduce((s, r) => s + r.balance, 0),
    count: rows.length,
  }), [rows]);

  return {
    loading,
    rows,
    expandedId,
    expandedLedger,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortDesc,
    setSortDesc,
    filteredRows,
    exportRows,
    totals,
    handleExpand,
  };
}
