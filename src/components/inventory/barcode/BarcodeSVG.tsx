import { useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeSVGProps {
    value: string;
    barWidth: number;
    height: number;
    barcodeScale: number;
    barcodeZoom: number;
}

export function BarcodeSVG({ value, barWidth, height, barcodeScale, barcodeZoom }: BarcodeSVGProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (svgRef.current && value) {
            try {
                svgRef.current.innerHTML = '';
                JsBarcode(svgRef.current, value, {
                    format: 'CODE128',
                    width: barWidth * barcodeScale,
                    height: height,
                    displayValue: false,
                    margin: 0,
                    background: 'transparent',
                });
                const svgEl = svgRef.current;
                const w = svgEl.getAttribute('width');
                const h = svgEl.getAttribute('height');
                if (w && h) {
                    const widthVal = w.replace('px', '');
                    const heightVal = h.replace('px', '');
                    svgEl.setAttribute('viewBox', `0 0 ${widthVal} ${heightVal}`);
                }
            } catch (err) {
                console.error('[BarcodeSVG] Failed to render:', err);
            }
        }
    }, [value, barWidth, height, barcodeScale]);

    return (
        <svg
            ref={svgRef}
            style={{
                width: '100%',
                height: '100%',
                maxWidth: `${100 * barcodeZoom}%`,
                maxHeight: '100%',
                display: 'block'
            }}
        />
    );
}
