import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface UseQrScannerArgs {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  isContinuous?: boolean;
}

export function useQrScanner({ onScan, onClose, isContinuous: initialContinuous = false }: UseQrScannerArgs) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_errorType, setErrorType] = useState<'permission' | 'hardware' | 'general' | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [continuousMode, setContinuousMode] = useState(initialContinuous);
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isContainerReady, setIsContainerReady] = useState(false);
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedText = useRef<string | null>(null);
  const lastScannedTime = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  const startAttemptRef = useRef(0);

  const CONTAINER_ID = "qr-reader-container";

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn("Stop scanner warning:", e);
      } finally {
        scannerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    const checkContainer = () => {
      const el = document.getElementById(CONTAINER_ID);
      if (el && el.offsetParent !== null) {
        setIsContainerReady(true);
      } else {
        setTimeout(checkContainer, 100);
      }
    };
    const timer = setTimeout(checkContainer, 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isContainerReady) {
      handleRetry();
    }
  }, []);

  useEffect(() => {
    if (!isContainerReady) return;

    const currentAttempt = ++startAttemptRef.current;
    isMountedRef.current = true;

    const startScanner = async () => {
      if (currentAttempt !== startAttemptRef.current) return;
      if (!isMountedRef.current) return;

      try {
        setError(null);
        setErrorType(null);
        setIsInitializing(true);

        await stopScanner();

        const container = document.getElementById(CONTAINER_ID);
        if (!container) throw new Error("Scanner container not found in DOM");

        let permissionStream: MediaStream | null = null;
        try {
          permissionStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } }
          });
          permissionStream.getTracks().forEach(track => track.stop());
        } catch (permErr: any) {
          const msg = permErr?.message || "";
          if (msg.includes("Permission") || msg.includes("NotAllowed") || permErr.name === "NotAllowedError") {
            setErrorType('permission');
            throw new Error("CAMERA_PERMISSION_DENIED");
          }
        }

        if (!isMountedRef.current || currentAttempt !== startAttemptRef.current) return;

        const allSupportedFormats = [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.AZTEC,
          Html5QrcodeSupportedFormats.PDF_417,
        ];

        const html5QrCode = new Html5Qrcode(CONTAINER_ID, {
          verbose: false,
          formatsToSupport: allSupportedFormats
        });

        scannerRef.current = html5QrCode;

        const config = {
          fps: 60,
          qrbox: (vw: number, vh: number) => {
            const width = Math.min(vw, vh) * (isMobile ? 0.9 : 0.8);
            const height = isMobile ? 140 : 180;
            return { width, height };
          },
          aspectRatio: 1.777778,
          rememberLastUsedCamera: true,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          videoConstraints: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 60 }
          }
        };

        const onScanSuccess = (decodedText: string) => {
          console.log("RAW SCAN:", decodedText);
          if (!isMountedRef.current) return;
          // eslint-disable-next-line no-control-regex -- intentionally strips ASCII control chars from scanner input
          const cleanText = decodedText.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();

          const now = Date.now();
          if (cleanText === lastScannedText.current && now - lastScannedTime.current < 3000) return;

          lastScannedText.current = cleanText;
          lastScannedTime.current = now;
          if (navigator.vibrate) navigator.vibrate(100);
          onScan(cleanText);
          if (!continuousMode) onClose();
        };

        let cameras: any[] = [];
        try {
          cameras = await Html5Qrcode.getCameras();
          if (isMountedRef.current) setAvailableCameras(cameras);
        } catch (camErr) { console.warn(camErr); }

        if (!isMountedRef.current || currentAttempt !== startAttemptRef.current) return;

        let started = false;
        if (cameras.length > 0 && !started) {
          try {
            const backCamera = cameras.find(c => {
              const label = c.label.toLowerCase();
              return (label.includes('back') || label.includes('rear') || label.includes('environment')) && !label.includes('front');
            });
            const targetCamera = cameras[currentCameraIndex] || backCamera || cameras[0];
            await html5QrCode.start(targetCamera.id, config, onScanSuccess, () => { });
            started = true;
          } catch (e) { console.warn(e); }
        }

        if (!started) {
          try {
            await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, () => { });
            started = true;
          } catch (e) { console.warn(e); }
        }

        if (!started) throw new Error("All camera start methods failed");

        if (isMountedRef.current) {
          setIsInitializing(false);
          const videoElement = document.querySelector(`#${CONTAINER_ID} video`) as HTMLVideoElement;
          if (videoElement) {
            videoElement.setAttribute('playsinline', 'true');
            videoElement.setAttribute('muted', 'true');
            videoElement.setAttribute('autoplay', 'true');
            videoElement.style.objectFit = 'cover';
          }
          try {
            const track = (html5QrCode as any).getActiveTrack?.();
            if (track) {
              const capabilities = track.getCapabilities?.();
              setHasTorch(!!capabilities?.torch);
            }
          } catch (_e) { }
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setError(err?.message || "Scanner failed");
        setIsInitializing(false);
      }
    };

    const timer = setTimeout(startScanner, isMobile ? 600 : 300);
    return () => clearTimeout(timer);
  }, [isContainerReady, currentCameraIndex, continuousMode, stopScanner]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [stopScanner]);

  const handleRetry = useCallback(() => {
    setIsContainerReady(false);
    setError(null);
    setErrorType(null);
    setIsInitializing(true);
    setTimeout(() => setIsContainerReady(true), 300);
  }, []);

  const switchCamera = useCallback(async () => {
    if (availableCameras.length < 2) return;
    await stopScanner();
    setCurrentCameraIndex(prev => (prev + 1) % availableCameras.length);
    setIsContainerReady(false);
    setTimeout(() => setIsContainerReady(true), 300);
  }, [availableCameras.length, stopScanner]);

  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const newState = !isTorchOn;
      await (scannerRef.current as any).applyVideoConstraints({ advanced: [{ torch: newState }] });
      setIsTorchOn(newState);
    } catch (_e) { }
  }, [hasTorch, isTorchOn]);

  return {
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
  };
}
