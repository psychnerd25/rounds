export function resolveContentConfig(development: boolean, reviewedUrl?: string, previewUrl?: string) {
  const preview = development ? previewUrl?.trim() : undefined;
  return { endpoint: preview || reviewedUrl?.trim() || undefined, allowPreview: !!preview };
}
