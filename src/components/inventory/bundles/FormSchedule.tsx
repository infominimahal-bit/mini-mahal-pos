import { Calendar, Clock, Repeat } from 'lucide-react';
import type { BundleForm } from './formTypes';

interface FormScheduleProps {
  form: BundleForm;
  setForm: (updater: (prev: BundleForm) => BundleForm) => void;
}

export function FormSchedule({ form, setForm }: FormScheduleProps) {
  return (
    <div className="bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Deal Schedule</label>
        </div>
        <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-0.5">
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, scheduleType: 'always' }))}
            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${form.scheduleType === 'always' ? 'bg-white dark:bg-surface shadow-md text-primary' : 'text-gray-500'}`}
          >
            Always On
          </button>
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, scheduleType: 'scheduled' }))}
            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${form.scheduleType === 'scheduled' ? 'bg-white dark:dark:bg-surface shadow-md text-primary' : 'text-gray-500'}`}
          >
            Scheduled
          </button>
        </div>
      </div>

      {form.scheduleType === 'scheduled' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                className="input w-full text-xs py-2"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                className="input w-full text-xs py-2"
              />
            </div>
          </div>

          {/* Repeat Days */}
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
              <Repeat className="h-3 w-3 inline -mt-0.5 mr-1" />
              Repeat On
            </label>
            <div className="flex gap-1">
              {[
                { key: 'mon', label: 'M' },
                { key: 'tue', label: 'T' },
                { key: 'wed', label: 'W' },
                { key: 'thu', label: 'T' },
                { key: 'fri', label: 'F' },
                { key: 'sat', label: 'S' },
                { key: 'sun', label: 'S' },
              ].map(d => {
                const isSelected = form.repeatDays.includes(d.key);
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => {
                      setForm(p => ({
                        ...p,
                        repeatDays: isSelected
                          ? p.repeatDays.filter(k => k !== d.key)
                          : [...p.repeatDays, d.key]
                      }));
                    }}
                    className={`h-8 w-8 rounded-lg text-[10px] font-black uppercase transition-all ${
                      isSelected
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/20'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Window */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">
                <Clock className="h-3 w-3 inline -mt-0.5 mr-1" />
                Start Time
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                className="input w-full text-xs py-2"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">
                <Clock className="h-3 w-3 inline -mt-0.5 mr-1" />
                End Time
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                className="input w-full text-xs py-2"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
