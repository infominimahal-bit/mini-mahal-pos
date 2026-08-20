import { useEffect, useRef, useState } from 'react';

export function ReceiptScaler({ paperWidthPx, children }: { paperWidthPx: string; children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const recalc = () => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth - 16;
    const receiptW = parseInt(paperWidthPx, 10) || 302;
    const newScale = containerW < receiptW ? containerW / receiptW : 1;
    setScale(newScale);
  };

  useEffect(() => {
    recalc();
    const ro = new ResizeObserver(recalc);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [paperWidthPx]);

  return (
    <div
      ref={containerRef}
      className="w-full flex justify-center py-1 sm:py-2 bg-gray-100/50 dark:bg-white/5 min-h-full overflow-hidden"
    >
      <div
        className="shadow-2xl bg-white p-1"
        style={{
          width: 'auto',
          maxWidth: scale < 1 ? 'none' : '95%',
          transform: scale < 1 ? `scale(${scale})` : 'none',
          transformOrigin: 'top center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
