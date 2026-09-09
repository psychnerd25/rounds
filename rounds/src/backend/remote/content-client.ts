import type { Catalog } from "../../domain/content";
import { CatalogBaseMismatch, mergeCatalogUpdate, parseCatalogUpdate, type CatalogSnapshot } from "../../domain/catalog-sync.ts";
import type { ContentRepository } from "../../services/contracts";
import { contentPayload } from "./content-payload.ts";

export type ContentStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};
export type RemoteContentOptions = {
  endpoint: string;
  cacheKey?: string;
  fetcher?: typeof fetch;
  fallback?: ContentRepository;
  timeoutMs?: number;
  /** Only enabled by the development composition for a labelled preview endpoint. */
  allowPreview?: boolean;
};

/** Public content only. No study state, account identity, or credentials. */
export function createContentClient(options: RemoteContentOptions, storage: ContentStorage): ContentRepository {
  const endpoint = new URL(options.endpoint);
  if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password)
    throw new Error("Content endpoint must be a public HTTP(S) URL");
  const key = options.cacheKey ?? `rounds.content.catalog.v2:${endpoint.href}`;
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("Invalid content timeout");
  let snapshot: CatalogSnapshot | null = null;
  let cachedLoad: Promise<Catalog | null> | null = null;
  let inFlight: Promise<Catalog> | null = null;
  let warning: string | null = null;
  let needsSave = false;
  const readCache = () => cachedLoad ??= (async () => {
    try {
      const raw = await storage.getItem(key);
      if (raw) {
        const candidate = parseCatalogUpdate(JSON.parse(raw), options);
        if (candidate.kind !== "full") throw new Error("Incomplete cache");
        snapshot = candidate;
        return snapshot.catalog;
      }
    } catch { /* Corrupt or inaccessible content cache must not block the bundle. */ }
    return null;
  })();

  const request = async (full: boolean) => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const url = new URL(endpoint.href);
    // A static JSON host may ignore this query and always return a full catalog.
    if (!full && snapshot) url.searchParams.set("since", String(snapshot.revision));
    else url.searchParams.delete("since");
    try {
      return await Promise.race([
        (async () => {
          const response = await fetcher(url.href, { signal: controller.signal, credentials: "omit", cache: "no-store" });
          if (response.status === 304 && snapshot) return snapshot;
          if (!response.ok) throw new Error(`Content request failed: ${response.status}`);
          return contentPayload(await response.json());
        })(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error("Content request timed out"));
            controller.abort();
          }, timeoutMs);
        }),
      ]);
    } finally { if (timer) clearTimeout(timer); }
  };
  const refresh = (): Promise<Catalog> => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      await readCache();
      let next: CatalogSnapshot;
      try { next = mergeCatalogUpdate(snapshot, await request(false), options); }
      catch (error) {
        if (!(error instanceof CatalogBaseMismatch)) throw error;
        next = mergeCatalogUpdate(snapshot, await request(true), options);
      }
      if (next !== snapshot) needsSave = true;
      snapshot = next;
      warning = null;
      if (needsSave) {
        try {
          await storage.setItem(key, JSON.stringify(snapshot));
          needsSave = false;
        } catch {
          warning = "New cards are available, but could not be saved for offline use. Check again to retry.";
        }
      }
      return snapshot.catalog;
    })().finally(() => { inFlight = null; });
    return inFlight;
  };
  return {
    async load() {
      const cached = await readCache();
      if (snapshot) return snapshot.catalog;
      if (cached) return cached;
      if (options.fallback) return options.fallback.load();
      return refresh();
    },
    refresh,
    getWarning: () => warning,
  };
}
