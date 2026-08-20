import { Plus, X, UserPlus, Eye } from 'lucide-react';
import { Customer } from '../../../types';

interface CustomerSearchDropdownProps {
  showCustomerSearch: boolean;
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
  isAddingCustomer: boolean;
  setIsAddingCustomer: (v: boolean) => void;
  newCustomer: { name: string; phone: string; email: string };
  setNewCustomer: (v: { name: string; phone: string; email: string }) => void;
  filteredCustomers: Customer[];
  selectCustomer: (c: Customer) => void;
  setViewingCustomer: (c: Customer | null) => void;
  setShowCustomerSearch: (v: boolean) => void;
  handleQuickAddCustomer: () => void;
}

export function CustomerSearchDropdown({
  customerSearch,
  setCustomerSearch,
  isAddingCustomer,
  setIsAddingCustomer,
  newCustomer,
  setNewCustomer,
  filteredCustomers,
  selectCustomer,
  setViewingCustomer,
  setShowCustomerSearch,
  handleQuickAddCustomer,
}: CustomerSearchDropdownProps) {
  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 max-h-[50vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
      {!isAddingCustomer ? (
        <div className="p-3 space-y-3">
          <div className="relative">
            <input
              type="text"
              autoFocus
              placeholder={"Search name, phone, email..."}
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full bg-gray-100 dark:bg-black/30 border-none rounded-xl px-4 py-2.5 text-[11px] font-bold text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              onClick={() => setIsAddingCustomer(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors flex items-center gap-1 text-[9px] font-black uppercase tracking-wider"
            >
              <Plus className="h-3.5 w-3.5" /> {"NEW"}
            </button>
          </div>

          <div className="max-h-[220px] overflow-y-auto custom-scrollbar divide-y divide-gray-100 dark:divide-white/5 pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">No customer found</p>
                <button
                  onClick={() => setIsAddingCustomer(true)}
                  className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"
                >
                  + Create New Customer
                </button>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center gap-1 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all group"
                >
                  <button
                    onClick={() => selectCustomer(customer)}
                    className="flex-1 text-left p-2.5 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-none group-hover:text-primary transition-colors">
                        {customer.name}
                      </p>
                      <p className="text-[9px] text-gray-500 mt-1">
                        {customer.phone || customer.email || 'No contact info'}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewingCustomer(customer); setShowCustomerSearch(false); }}
                    className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 mr-1"
                    title="View customer profile"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Skip / No Customer */}
          <button
            onClick={() => { setShowCustomerSearch(false); setCustomerSearch(''); }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-gray-200 dark:border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
          >
            <X className="h-3 w-3" />
            Skip — No Customer
          </button>
        </div>
      ) : (
        <div className="p-3 space-y-3 bg-emerald-50/50 dark:bg-emerald-950/10">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
              <UserPlus className="h-3 w-3 text-primary" /> Quick Add Customer
            </span>
            <button onClick={() => setIsAddingCustomer(false)}>
              <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          <div className="space-y-2">
            {['name', 'phone', 'email'].map((key) => (
              <input
                key={key}
                type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
                placeholder={`Customer ${key.toUpperCase()}${key === 'name' || key === 'phone' ? ' *' : ''}`}
                value={newCustomer[key as keyof typeof newCustomer]}
                onChange={(e) => setNewCustomer({ ...newCustomer, [key]: e.target.value })}
                className="w-full bg-white dark:bg-black/30 border border-emerald-200 dark:border-emerald-800/30 rounded-xl px-3 py-2 text-[11px] font-bold text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500/20"
              />
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={handleQuickAddCustomer} className="btn btn-md btn-primary flex-1 hover:bg-emerald-700">
              Save & Link
            </button>
            <button
              onClick={() => setIsAddingCustomer(false)}
              className="px-3 py-1.5 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-[9px] font-bold uppercase tracking-wider rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
