import { useUsersStore } from '../../stores';
import { useState, useEffect } from 'react';
import { Loader2, Save, User as UserIcon, Phone } from 'lucide-react';
import { Salesman } from '../../types';
import { salesmenService } from '../../lib/services';
import { sonner } from '../../lib/sonner';
import { Modal } from '../../shared/ui/Modal';
import { Button, ToggleSwitch } from '../../shared/ui';

interface SalesmanModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesman?: Salesman | null;
}

export function SalesmanModal({ isOpen, onClose, salesman }: SalesmanModalProps) {
  const appSalesmen = useUsersStore(s => s.salesmen);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    active: true,
  });

  useEffect(() => {
    if (salesman) {
      setFormData({
        name: salesman.name,
        phone: salesman.phone || '',
        active: salesman.active,
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        active: true,
      });
    }
  }, [salesman, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        sonner.error('Name is required');
        setLoading(false);
        return;
      }

      if (salesman) {
        const updatePayload = {
          name: formData.name,
          phone: formData.phone,
          active: formData.active,
        };

        const updatedSalesman = await salesmenService.update(salesman.id, updatePayload);
        
        useUsersStore.getState().setSalesmen(appSalesmen.map(s => s.id === salesman.id ? updatedSalesman : s));
        sonner.success('Salesman updated successfully');
      } else {
        const newSalesman = await salesmenService.create({
          name: formData.name,
          phone: formData.phone,
          active: formData.active,
        });

        useUsersStore.getState().addSalesman(newSalesman);
        sonner.success('Salesman added successfully');
      }

      onClose();
    } catch (error) {
      sonner.error(`Error saving salesman: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const footer = (
    <div className="flex items-center justify-end gap-2 sm:gap-3 w-full">
      <Button
        type="button"
        variant="ghost"
        onClick={onClose}
        className="!min-h-0 !px-4 sm:!px-6 !py-2.5 sm:!py-3.5 !text-[9px] sm:!text-[10px] !font-black !text-[#ff4b6e] !border !border-rose-200 dark:!border-rose-900/30 hover:!bg-rose-50 dark:hover:!bg-rose-500/10 !shrink-0"
      >
        {"DISCARD"}
      </Button>
      <Button
        type="button"
        variant="primary"
        onClick={handleSubmit}
        disabled={loading}
        className="!flex-1 sm:!flex-none sm:!min-w-[240px] !py-2.5 sm:!py-3.5 !text-[9px] sm:!text-[11px]"
      >
        {loading ? <Loader2 className="w-4 h-4 sm:h-5 sm:w-5 animate-spin shrink-0" /> : <Save className="w-4 h-4 sm:h-5 sm:w-5 shrink-0" />}
        <span className="leading-none ml-2">
          {salesman ? "COMMIT CHANGES" : "REGISTER SALESMAN"}
        </span>
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={salesman ? "EDIT SALESMAN" : "REGISTER NEW SALESMAN"}
      maxWidth="lg"
      footer={footer}
    >
      <div className="space-y-10">
        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest flex items-center gap-3">
            <span className="w-8 h-px bg-gray-200 dark:bg-white/10"></span>
            {"Identity Details"}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"Full Legal Name *"}</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full pl-11 bg-[#f8f9fa] dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-wider">{"Phone Number (Optional)"}</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-11 bg-[#f8f9fa] dark:bg-black/75 border-none text-gray-900 dark:text-white text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  placeholder="0300 1234567"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Access Protocol */}
        <div className="p-5 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-[24px] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">{"System Status"}</span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-0.5">{"Active / Inactive"}</span>
          </div>
          <ToggleSwitch
            checked={formData.active}
            onChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
            size="md"
            color="bg-emerald-500"
            className="!scale-110"
          />
        </div>
      </div>
    </Modal>
  );
}
