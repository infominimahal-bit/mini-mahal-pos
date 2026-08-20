import React, { useRef } from 'react';
import { Download, Upload, FileJson, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '../../shared/ui';
import { useDataExport } from './useDataExport';

interface Props {
  selectedStores: Set<string>;
  canExportDb: boolean;
}

export function DataExportTools({ selectedStores, canExportDb }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    isExporting,
    isImporting,
    selectedFile,
    setSelectedFile,
    handleExport,
    handleImport
  } = useDataExport(selectedStores, canExportDb);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
  };

  return (
    <div className="bg-white dark:bg-black/20 p-5 rounded-[2rem] border border-gray-200 dark:border-white/5 shadow-md space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Export Panel */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-500" />
            <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Export</h4>
          </div>
          <p className="text-[10px] text-gray-500 font-medium">Backup selected tables to JSON file.</p>
          <Button
            type="button"
            onClick={handleExport}
            disabled={isExporting || selectedStores.size === 0 || !canExportDb}
            className="w-full !py-2.5 !rounded-xl !text-[9px] !font-black !gap-1.5 !bg-blue-600 hover:!bg-blue-700 !shadow-md disabled:!opacity-40"
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileJson className="h-3.5 h-3.5" />}
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>

        {/* Import Panel */}
        <div className="space-y-3 border-t sm:border-t-0 sm:border-l border-gray-100 dark:border-white/5 sm:pl-4 pt-3 sm:pt-0">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Import</h4>
          </div>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-2 p-2 rounded-xl border border-dashed cursor-pointer transition-all ${selectedFile ? 'border-emerald-300 dark:border-primary/40 bg-emerald-50/50 dark:bg-primary/5' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]'}`}
          >
            <FileJson className={`w-4 h-4 shrink-0 ${selectedFile ? 'text-primary' : 'text-gray-400'}`} />
            <span className={`text-[10px] font-bold truncate ${selectedFile ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-400'}`}>
              {selectedFile ? selectedFile.name : 'Select file'}
            </span>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
          <Button
            type="button"
            onClick={handleImport}
            disabled={isImporting || !selectedFile || selectedStores.size === 0 || !canExportDb}
            className="w-full !py-2.5 !rounded-xl !text-[9px] !font-black !gap-1.5 !shadow-md hover:!bg-emerald-700 disabled:!opacity-40"
          >
            {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 h-3.5" />}
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </div>

      </div>

      <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/25 rounded-xl flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[9px] text-amber-800/80 dark:text-amber-400/60 font-bold leading-relaxed uppercase tracking-wider">
          Import merges records. Duplicates are auto-skipped by ID/SKU/Barcode/Invoice.
        </p>
      </div>
      {!canExportDb && (
        <div className="p-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/25 rounded-xl flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-[9px] text-rose-800/80 dark:text-rose-400/60 font-bold leading-relaxed uppercase tracking-wider">
            Database export / import / reset is admin-only.
          </p>
        </div>
      )}
    </div>
  );
}
