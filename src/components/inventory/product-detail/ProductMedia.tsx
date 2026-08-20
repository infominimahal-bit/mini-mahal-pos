import { CameraScanner } from '../../../shared/ui/CameraScanner';
import { MediaLibrary } from '../../../shared/MediaLibrary';
import type { ProductDetailController } from './useProductDetail';

export function ProductMedia({ d }: { d: ProductDetailController }) {
  const { showMediaLibrary, setShowMediaLibrary, setFormData, showScanner, setShowScanner, activeScannerField } = d;

  return (
    <>
      {showMediaLibrary && (
        <MediaLibrary
          isOpen={showMediaLibrary}
          onClose={() => setShowMediaLibrary(false)}
          onSelect={(url) => setFormData(prev => ({ ...prev, image: url }))}
        />
      )}

      {showScanner && (
        <CameraScanner
          onScan={(code) => {
            setFormData(prev => ({ ...prev, [activeScannerField]: code }));
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}
