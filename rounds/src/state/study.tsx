import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import {
  activity,
  dayKey,
  streak,
  emptyState,
  type StudyState,
} from "./progress";
import { applyStudyCommand, type StudyCommand } from "../domain/study-service";
import { newId } from "../domain/interactions";
import { localStudyRepository } from "../backend/local/study-repository";
import type { UserProgressRepository } from "../services/contracts";
function useStudyStore(repository: UserProgressRepository) {
  const [state, setState] = useState<StudyState>(emptyState);
  const current = useRef(state);
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [today, setToday] = useState(dayKey());
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [celebration, setCelebration] = useState<{
    day: string;
    streak: number;
  } | null>(null);
  const [pawCelebration, setPawCelebration] = useState<{
    amount: number;
    unlocked: boolean;
  } | null>(null);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    if (!ready)
      repository
        .load()
        .then((s) => {
          if (!active) return;
          current.current = s;
          setState(s);
          setReady(true);
          setError("");
        })
        .catch(() => {
          if (active)
            setError(
              "Your saved data could not be loaded. It has been preserved. Please retry.",
            );
        });
    return () => {
      active = false;
    };
  }, [repository, attempt, ready]);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setSaving(true);
    writes.current = writes.current
      .catch(() => {})
      .then(() => repository.save(state));
    writes.current
      .then(() => {
        if (active) {
          setError("");
          setSaving(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Your latest changes are still in memory. Retry saving before closing Rounds.",
          );
          setSaving(false);
        }
      });
    return () => {
      active = false;
    };
  }, [state, ready, attempt, repository]);
  useEffect(() => {
    const timer = setInterval(() => setToday(dayKey()), 30000);
    const sub = AppState.addEventListener("change", () => setToday(dayKey()));
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  const dispatch = (command: StudyCommand, id: string = newId()) => {
    if (!ready) return null;
    const result = applyStudyCommand(current.current, command, id);
    if (result.state !== current.current) {
      current.current = result.state;
      setState(result.state);
      if (command.kind === "complete") {
        if (result.firstToday)
          setCelebration({
            day: dayKey(),
            streak: streak(activity(result.state)),
          });
        if (result.amount)
          setPawCelebration({
            amount: result.amount,
            unlocked: result.newUnlocks.length > 0,
          });
      }
    }
    setToday(dayKey());
    return result;
  };
  const allActivity = activity(state),
    todayActivity = allActivity.filter((e) => e.day === today);
  return {
    ...state,
    ready,
    error,
    saving,
    today,
    dispatch,
    snapshot: () => current.current,
    retryPersistence: () => setAttempt((a) => a + 1),
    todayDone: todayActivity.length > 0,
    reviewed: new Set(todayActivity.map((e) => e.cardId)).size,
    shortsToday: state.reads.filter((e) => e.day === today).length,
    recallsToday: state.events.filter((e) => e.day === today).length,
    accuracy: state.events.length
      ? Math.round(
          (100 * state.events.filter((e) => e.rating === "known").length) /
            state.events.length,
        )
      : null,
    streak: streak(allActivity),
    latest: Object.fromEntries(state.events.map((e) => [e.cardId, e.rating])),
    allActivity,
    toggleSaved: (cardId: string) => dispatch({ kind: "save", cardId }),
    seePawUnlocks: () => dispatch({ kind: "unlocks_seen" }),
    celebration,
    dismissCelebration: () => setCelebration(null),
    pawCelebration,
    dismissPawCelebration: () => setPawCelebration(null),
  };
}
const StudyContext = createContext<ReturnType<typeof useStudyStore> | null>(
  null,
);
export function StudyProvider({
  children,
  repository = localStudyRepository,
}: {
  children: ReactNode;
  repository?: UserProgressRepository;
}) {
  const value = useStudyStore(repository);
  return (
    <StudyContext.Provider value={value}>{children}</StudyContext.Provider>
  );
}
export function useStudy() {
  const value = useContext(StudyContext);
  if (!value) throw new Error("StudyProvider missing");
  return value;
}
