import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export const palettes = {
  light: {
    paper: "#F2EDE0", white: "#FFFAF0", ink: "#253E37", muted: "#756F64",
    teal: "#2D6857", mint: "#DDE9E1", line: "#DDD4BF", coral: "#AF735C",
    rose: "#F5E9E3", onAccent: "#FFFFFF", soft: "#E9E3D7", warm: "#F5E6C8",
  },
  dark: {
    paper: "#14231F", white: "#1E302A", ink: "#F2EDE0", muted: "#B8BDB0",
    teal: "#9BD3B9", mint: "#2C473B", line: "#3B5045", coral: "#E0A68A",
    rose: "#49382F", onAccent: "#14231F", soft: "#293B32", warm: "#463E2C",
  },
};
export type AppearanceMode = keyof typeof palettes;
const storageKey = "rounds.appearance.v1";
const AppearanceContext = createContext({
  mode: "light" as AppearanceMode,
  setMode: (_mode: AppearanceMode) => {},
  error: "",
});

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [mode, updateMode] = useState<AppearanceMode>("light");
  const [error, setError] = useState("");
  const changed = useRef(false);
  const writes = useRef(Promise.resolve());
  const revision = useRef(0);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey).then(value => {
      if (active && !changed.current && (value === "light" || value === "dark")) updateMode(value);
    }).catch(() => {
      if (active && !changed.current) setError("Your saved appearance could not be loaded. Choose a mode to save it again.");
    });
    return () => { active = false; };
  }, []);
  function setMode(next: AppearanceMode) {
    changed.current = true;
    updateMode(next);
    setError("");
    const currentRevision = ++revision.current;
    writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem(storageKey, next));
    writes.current.catch(() => {
      if (revision.current === currentRevision) setError("Appearance changed, but could not be saved. Tap your mode to retry.");
    });
  }
  return <AppearanceContext.Provider value={{ mode, setMode, error }}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() { return useContext(AppearanceContext); }
