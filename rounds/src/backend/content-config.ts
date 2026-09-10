export function resolveContentConfig(development: boolean, publicUrl?: string, previewUrl?: string) {
  const published = publicUrl?.trim() || undefined;
  const preview = development && !published ? previewUrl?.trim() || undefined : undefined;
  return { endpoint: published || preview, allowPreview: !!preview };
}
