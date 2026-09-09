import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduced)
      .catch(() => setReduced(true));
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => subscription.remove();
  }, []);
  return reduced;
}
