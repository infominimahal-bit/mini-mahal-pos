import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '../../shared/ui/Modal';
import { Button } from '../../shared/ui';

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50";

interface SupervisorPinModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  isProcessing: boolean;
  onSubmit: (email: string, password: string) => Promise<boolean>;
  onClose: () => void;
}

/**
 * RBAC SUPERVISOR OVERRIDE — admin email+password proof for restricted ops
 * (sale delete / refund above threshold). Verifies server-side via signed
 * action token; wrong credentials simply fail the RPC verification.
 */
export function SupervisorPinModal({ isOpen, title, description, isProcessing, onSubmit, onClose }: SupervisorPinModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Admin email aur password dono zaroori hain.');
      return;
    }
    setError('');
    const ok = await onSubmit(email.trim(), password);
    if (ok) {
      setPassword('');
      setEmail('');
    } else {
      setError('Authorization failed. Sirf active admin account chalega.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} showClose={!isProcessing} maxWidth="sm">
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-xl">
          <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-xs font-bold leading-relaxed">{description}</p>
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Admin Email</label>
          <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@gmail.com" autoComplete="username" disabled={isProcessing} />
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Admin Password</label>
          <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" disabled={isProcessing}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }} />
        </div>
        {error && (
          <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wide">{error}</p>
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={isProcessing} className="flex-1">Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isProcessing} className="flex-1">
            {isProcessing ? 'Verifying…' : 'Approve & Continue'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
