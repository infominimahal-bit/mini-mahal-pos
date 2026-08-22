export function updateDynamicManifest(opts: {
  storeName: string;
  themeColor?: string;
}) {
  const origin = window.location.origin;

  // Universal branding (no brand hardcoded): tenant name from settings, neutral 'POS' fallback.
  const bizName = (opts.storeName || '').trim() || 'POS';
  const name = `POS - ${bizName}`;
  const shortName = bizName.length > 12 ? bizName.substring(0, 10) + '…' : bizName;
  const iconSrc = origin + '/zaynahs-logo.svg';

  const manifest: Record<string, unknown> = {
    name,
    short_name: shortName,
    description: 'Fast, offline-first point-of-sale system',
    start_url: origin + '/pos',
    scope: origin + '/pos',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0a0a0a',
    theme_color: opts.themeColor || '#10b981',
    categories: ['business', 'finance', 'productivity'],
    icons: [
      {
        src: iconSrc,
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: iconSrc,
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };

  const blob = new Blob([JSON.stringify(manifest)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);

  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (link) {
    link.href = url;
  } else {
    link = document.createElement('link');
    link.rel = 'manifest';
    link.href = url;
    document.head.appendChild(link);
  }

  return url;
}
