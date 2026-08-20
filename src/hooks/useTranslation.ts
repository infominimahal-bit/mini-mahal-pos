// Translation system removed: the app is English-only. `t` returns the supplied
// fallback (or the key) so any residual dynamic call still resolves to English.
export function useTranslation() {
  const t = (key: string, fallback?: string): string => fallback ?? key;
  return { t, lang: 'en', isRtl: false };
}
export type UseTranslationResponse = ReturnType<typeof useTranslation>;
