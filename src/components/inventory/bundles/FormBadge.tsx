import { Tag } from 'lucide-react';
import type { BundleForm } from './formTypes';

interface FormBadgeProps {
  form: BundleForm;
  setForm: (updater: (prev: BundleForm) => BundleForm) => void;
}

export function FormBadge({ form, setForm }: FormBadgeProps) {
  return (
    <div className="bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-gray-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{"Badge"}</span>
        </div>
        <button
          type="button"
          onClick={() => setForm(p => ({ ...p, badgeEnabled: !p.badgeEnabled }))}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 focus:outline-none ${
            form.badgeEnabled
              ? 'bg-violet-500 shadow-lg shadow-violet-500/30'
              : 'bg-gray-300 dark:bg-white/10'
          }`}
          aria-checked={form.badgeEnabled}
          role="switch"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
              form.badgeEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {form.badgeEnabled && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Badge Text */}
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Badge Text</label>
            <input
              type="text"
              value={form.badgeText}
              onChange={e => setForm(p => ({ ...p, badgeText: e.target.value }))}
              placeholder="e.g. CROWN, HOT DEAL, LIMITED"
              maxLength={20}
              className="input w-full text-xs py-2"
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Icon</label>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { id: 'crown', icon: '👑' },
                { id: 'sun', icon: '☀️' },
                { id: 'fire', icon: '🔥' },
                { id: 'star', icon: '⭐' },
                { id: 'tag', icon: '🏷️' },
                { id: 'percent', icon: '%' },
                { id: 'party', icon: '🎉' },
                { id: 'zap', icon: '⚡' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, badgeIcon: opt.id }))}
                  className={`h-8 w-8 rounded-lg text-sm flex items-center justify-center transition-all ${
                    form.badgeIcon === opt.id
                      ? 'bg-primary text-white shadow-md ring-2 ring-primary/30'
                      : 'bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 hover:border-primary/50'
                  }`}
                  title={opt.id}
                >
                  {opt.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Background Color Presets */}
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Background Color</label>
            <div className="flex gap-2 items-center">
              {[
                { id: '#D4AF37', label: 'Gold' },
                { id: '#EF4444', label: 'Red' },
                { id: '#F97316', label: 'Orange' },
                { id: '#1A1A1A', label: 'Dark' },
                { id: '#3B82F6', label: 'Blue' },
                { id: '#10B981', label: 'Green' },
              ].map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, badgeBgColor: preset.id }))}
                  className={`h-7 w-7 rounded-full shrink-0 transition-all ${
                    form.badgeBgColor === preset.id ? 'ring-2 ring-offset-1 ring-primary' : ''
                  }`}
                  style={{ backgroundColor: preset.id }}
                  title={preset.label}
                />
              ))}
              <div className="relative">
                <input
                  type="color"
                  value={form.badgeBgColor}
                  onChange={e => setForm(p => ({ ...p, badgeBgColor: e.target.value }))}
                  className="h-7 w-7 rounded-full cursor-pointer border-0 p-0"
                  title="Custom color"
                />
              </div>
            </div>
          </div>

          {/* Text Color */}
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Text Color</label>
            <div className="flex gap-2 items-center">
              {[
                { id: '#FFFFFF', label: 'White' },
                { id: '#1A1A1A', label: 'Black' },
                { id: '#D4AF37', label: 'Gold' },
                { id: '#FEF3C7', label: 'Light' },
              ].map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, badgeTextColor: preset.id }))}
                  className={`h-7 w-7 rounded-full shrink-0 border border-gray-300 transition-all ${
                    form.badgeTextColor === preset.id ? 'ring-2 ring-offset-1 ring-primary' : ''
                  }`}
                  style={{ backgroundColor: preset.id }}
                  title={preset.label}
                />
              ))}
              <div className="relative">
                <input
                  type="color"
                  value={form.badgeTextColor}
                  onChange={e => setForm(p => ({ ...p, badgeTextColor: e.target.value }))}
                  className="h-7 w-7 rounded-full cursor-pointer border-0 p-0"
                  title="Custom color"
                />
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="bg-white dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/10 p-3 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Preview</span>
              <span
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider"
                style={{
                  backgroundColor: form.badgeBgColor || '#1A1A1A',
                  color: form.badgeTextColor || '#D4AF37',
                }}
              >
                {form.badgeIcon === 'crown' && '👑'}
                {form.badgeIcon === 'sun' && '☀️'}
                {form.badgeIcon === 'fire' && '🔥'}
                {form.badgeIcon === 'star' && '⭐'}
                {form.badgeIcon === 'tag' && '🏷️'}
                {form.badgeIcon === 'percent' && '%'}
                {form.badgeIcon === 'party' && '🎉'}
                {form.badgeIcon === 'zap' && '⚡'}
                {' '}{form.badgeText || 'BADGE'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
