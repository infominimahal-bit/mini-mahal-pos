import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useGridSearchFocus(searchRef: RefObject<HTMLInputElement>) {
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 0 && /Macintosh/i.test(navigator.userAgent));

    if (isMobile) return;

    const focusSearch = () => searchRef.current?.focus({ preventScroll: true });
    focusSearch();
    setTimeout(focusSearch, 100);
    setTimeout(focusSearch, 500);

    window.addEventListener('focus', focusSearch);

    const handleGlobalClick = () => {
      if (document.querySelector('.fixed.inset-0')) return;

      if (
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        focusSearch();
      }
    };
    document.addEventListener('click', handleGlobalClick);

    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if (document.querySelector('.fixed.inset-0')) return;

      if (
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT' &&
        e.key.length === 1
      ) {
        focusSearch();
      }
    };
    document.addEventListener('keydown', handleGlobalKeydown, { capture: true });

    const handleManualRefocus = () => focusSearch();
    window.addEventListener('refocus-search', handleManualRefocus);

    return () => {
      window.removeEventListener('focus', focusSearch);
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleGlobalKeydown, { capture: true });
      window.removeEventListener('refocus-search', handleManualRefocus);
    };
  }, []);
}
