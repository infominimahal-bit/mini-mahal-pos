import { Zap, ZapOff, RefreshCw, Smartphone } from 'lucide-react';

interface CameraScannerFooterProps {
  handleRetry: () => void;
  switchCamera: () => void;
  availableCameras: any[];
  currentCameraIndex: number;
  hasTorch: boolean;
  toggleTorch: () => void;
  isTorchOn: boolean;
  continuousMode: boolean;
  setContinuousMode: (v: boolean) => void;
  isInitializing: boolean;
}

export function CameraScannerFooter({ handleRetry, switchCamera, availableCameras, currentCameraIndex, hasTorch, toggleTorch, isTorchOn, continuousMode, setContinuousMode, isInitializing }: CameraScannerFooterProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex gap-2.5">
          <button
            onClick={handleRetry}
            className="p-3.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-90 border border-white/5"
            title="Refresh Engine"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${isInitializing ? 'animate-spin' : ''}`} />
          </button>

          {availableCameras.length > 1 && (
            <button
              onClick={switchCamera}
              className="p-3.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-90 border border-white/5 flex items-center gap-2"
            >
              <Smartphone className="w-5 h-5 text-gray-600" />
              <span className="text-[9px] font-black text-gray-600 uppercase tracking-tighter">{currentCameraIndex + 1}/{availableCameras.length}</span>
            </button>
          )}

          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-3.5 rounded-2xl transition-all active:scale-90 border ${isTorchOn ? 'bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-white/5 border-white/5 text-gray-600'}`}
            >
              {isTorchOn ? <ZapOff className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            </button>
          )}
        </div>

        <button
          onClick={() => setContinuousMode(!continuousMode)}
          className={`px-5 py-3.5 rounded-2xl flex items-center gap-3 transition-all active:scale-95 border ${continuousMode ? 'bg-primary/10 border-primary/30 ring-1 ring-emerald-500/20' : 'bg-white/5 border-white/5'}`}
        >
          <div className={`w-2.5 h-2.5 rounded-full ${continuousMode ? 'bg-primary animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]' : 'bg-gray-600'}`} />
          <span className={`text-[10px] font-black uppercase tracking-widest ${continuousMode ? 'text-emerald-400' : 'text-gray-600'}`}>
            {continuousMode ? 'Continuous' : 'Single Scan'}
          </span>
        </button>
      </div>
    </div>
  );
}
