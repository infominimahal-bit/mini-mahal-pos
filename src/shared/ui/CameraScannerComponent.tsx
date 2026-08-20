import { Modal } from '../../shared/ui/Modal';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useQrScanner } from './useQrScanner';
import { CameraScannerFooter } from './CameraScannerFooter';

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  title?: string;
  isContinuous?: boolean;
}

export function CameraScanner({
  onScan,
  onClose,
  title = "Scan Barcode / IMEI",
  isContinuous: initialContinuous = false
}: CameraScannerProps) {
  const {
    isInitializing,
    error,
    isMobile,
    containerRef,
    CONTAINER_ID,
    handleRetry,
    switchCamera,
    toggleTorch,
    isTorchOn,
    hasTorch,
    continuousMode,
    setContinuousMode,
    availableCameras,
    currentCameraIndex,
  } = useQrScanner({ onScan, onClose, isContinuous: initialContinuous });

  const footer = (
    <CameraScannerFooter
      handleRetry={handleRetry}
      switchCamera={switchCamera}
      availableCameras={availableCameras}
      currentCameraIndex={currentCameraIndex}
      hasTorch={hasTorch}
      toggleTorch={toggleTorch}
      isTorchOn={isTorchOn}
      continuousMode={continuousMode}
      setContinuousMode={setContinuousMode}
      isInitializing={isInitializing}
    />
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={footer}
    >
      <style>{`
        #${CONTAINER_ID} canvas { display: none !important; }
        #${CONTAINER_ID} video { object-fit: cover !important; width: 100% !important; height: 100% !important; min-height: 380px !important; }
        #${CONTAINER_ID} { overflow: hidden !important; border-radius: 1.5rem !important; min-height: 380px !important; }
      `}</style>

      <div className="relative bg-[#000] overflow-hidden flex-1 min-h-[380px] sm:min-h-[420px] flex items-center justify-center rounded-[2rem]">
        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20 bg-[#000]">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-[10px] font-black text-primary uppercase tracking-widest animate-pulse">Initializing Engine...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 gap-6 z-20 bg-[#000]">
            <div className="w-16 h-16 bg-rose-500/10 rounded-3xl flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-white font-black text-sm uppercase tracking-tight">Access Restricted</p>
              <p className="text-gray-600 text-[10px] font-bold uppercase leading-relaxed max-w-[200px] mx-auto">{error}</p>
            </div>
            <button
              onClick={handleRetry}
              className="btn btn-md btn-primary"
            >
              Restart Engine
            </button>
          </div>
        )}

        <div id={CONTAINER_ID} ref={containerRef} className="w-full h-full absolute inset-0 z-0" style={{ visibility: (isInitializing || error) ? 'hidden' : 'visible' }} />

        {!isInitializing && !error && (
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <div className="relative" style={{ width: isMobile ? '90%' : '300px', height: isMobile ? '140px' : '180px', maxWidth: '340px' }}>
              <div className="absolute -top-1 -left-1 w-10 h-10 border-t-[4px] border-l-[4px] border-primary rounded-tl-2xl shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
              <div className="absolute -top-1 -right-1 w-10 h-10 border-t-[4px] border-r-[4px] border-primary rounded-tr-2xl shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
              <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-[4px] border-l-[4px] border-primary rounded-bl-2xl shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
              <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-[4px] border-r-[4px] border-primary rounded-br-2xl shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
              <div className="absolute inset-x-0 h-[2.5px] bg-emerald-400 shadow-[0_0_25px_rgba(16,185,129,1)] animate-scan opacity-90" />
              <div className="absolute inset-0 bg-primary/10 rounded-2xl ring-1 ring-emerald-500/30" />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
