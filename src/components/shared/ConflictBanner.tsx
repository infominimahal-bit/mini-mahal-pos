import React from 'react';
import { useConflictStore } from '../../stores/conflictStore';
import { AlertTriangle } from 'lucide-react';

export const ConflictBanner: React.FC = () => {
  const { conflicts, resolveConflict } = useConflictStore();
  const active = conflicts.filter(c => !c.resolved);
  if (!active.length) return null;
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-xs">
      {active.map(c => (
        <div key={c.id} className="bg-amber-900 border border-amber-600 rounded-lg p-3 shadow-xl">
          <div className="flex gap-2 items-start">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-200 text-sm font-medium">Sync Conflict</p>
              <p className="text-amber-300 text-xs mt-0.5">Sale modified on another device.</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => resolveConflict(c.id, 'cloud')}
                  className="text-xs bg-amber-700 hover:bg-amber-600 text-white px-2 py-1 rounded">
                  Keep Other Device
                </button>
                <button onClick={() => resolveConflict(c.id, 'local')}
                  className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded">
                  Keep This Device
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
