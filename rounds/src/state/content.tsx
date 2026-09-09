import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type { Catalog } from "../domain/content";
import type { ContentRepository } from "../services/contracts";
import { localContentRepository } from "../backend/local/content";
import { Button, Copy } from "../components/rounds/ui";
import { assertCatalog } from "../domain/catalog-validation";
import { AppState } from "react-native";
type ContentContext = Catalog & {
  refresh: () => Promise<void>;
  refreshing: boolean;
  refreshError: string | null;
  lastChecked: string | null;
  remoteEnabled: boolean;
};
const Context = createContext<ContentContext | null>(null);
export function ContentProvider({
  children,
  repository = localContentRepository,
}: {
  children: ReactNode;
  repository?: ContentRepository;
}) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    let active = true;
    let pending: Promise<void> | null = null;
    let lastAttempt = 0;
    const refresh = () => {
      if (!active || !repository.refresh) return Promise.resolve();
      if (pending) return pending;
      lastAttempt = Date.now();
      setRefreshing(true);
      pending = (async () => {
        try {
          const data = assertCatalog(await repository.refresh!());
          if (active) {
            setCatalog(data);
            setRefreshError(repository.getWarning?.() ?? null);
            setLastChecked(new Date().toISOString());
          }
        } catch {
          if (active) setRefreshError("Could not check for new cards. Your saved library is still available. Try again when connected.");
        } finally {
          pending = null;
          if (active) setRefreshing(false);
        }
      })();
      return pending;
    };
    refreshRef.current = refresh;
    const backgroundRefresh = () => {
      if (AppState.currentState !== "background" && AppState.currentState !== "inactive" &&
        Date.now() - lastAttempt >= 5 * 60 * 1000) void refresh();
    };
    setError(false);
    repository
      .load()
      .then((data) => {
        assertCatalog(data);
        if (active) {
          setCatalog(data);
          void refresh();
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    const subscription = repository.refresh ? AppState.addEventListener("change", backgroundRefresh) : null;
    const timer = repository.refresh ? setInterval(backgroundRefresh, 5 * 60 * 1000) : null;
    return () => {
      active = false;
      subscription?.remove();
      if (timer) clearInterval(timer);
    };
  }, [repository, attempt]);
  if (error)
    return (
      <>
        <Copy>Could not load your offline library.</Copy>
        <Button onPress={() => setAttempt(attempt + 1)}>Try again</Button>
      </>
    );
  if (!catalog) return <Copy>Preparing your library…</Copy>;
  return <Context.Provider value={{ ...catalog, refresh: () => refreshRef.current(), refreshing,
    refreshError, lastChecked, remoteEnabled: !!repository.refresh }}>{children}</Context.Provider>;
}
export function useContent() {
  const catalog = useContext(Context);
  if (!catalog) throw new Error("ContentProvider missing");
  return catalog;
}
