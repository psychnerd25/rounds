import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import { useReducedMotion } from "../../hooks/use-reduced-motion";
import { Copy, serif, useRoundsTheme } from "./ui";
import { PawMark } from "./miso-mark";

/** A single, finite burst. The final reward remains visible until dismissed. */
export function RewardBurst({ amount, kind }: { amount: number; kind: "streak" | "paws" }) {
  const { palette } = useRoundsTheme();
  const reduced = useReducedMotion();
  const entrance = useRef(new Animated.Value(1)).current;
  const burst = useRef(new Animated.Value(1)).current;
  const counter = useRef(new Animated.Value(amount)).current;
  const [display, setDisplay] = useState(amount);
  useEffect(() => {
    if (reduced) {
      entrance.setValue(1);
      burst.setValue(1);
      counter.setValue(amount);
      setDisplay(amount);
      return;
    }
    entrance.setValue(0);
    burst.setValue(0);
    counter.setValue(kind === "streak" ? Math.max(0, amount - 1) : 0);
    setDisplay(kind === "streak" ? Math.max(0, amount - 1) : 0);
    const listener = counter.addListener(({ value }) => setDisplay(Math.round(value)));
    const animation = Animated.parallel([
      Animated.spring(entrance, { toValue: 1, damping: 9, stiffness: 140, mass: 0.7, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(burst, { toValue: 1, duration: 1100, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(counter, { toValue: amount, duration: 800, delay: 180, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]);
    animation.start();
    return () => { animation.stop(); counter.removeListener(listener); };
  }, [amount, kind, reduced, entrance, burst, counter]);
  return (
    <View accessible accessibilityLabel={kind === "streak" ? `${amount} day streak` : `${amount} Paw Points earned`} style={{ width: 174, height: 164, alignItems: "center", justifyContent: "center" }}>
      <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 174, height: 164, alignItems: "center", justifyContent: "center" }}>
        {!reduced && <>
          <Animated.View style={{ position: "absolute", width: 118, height: 118, borderRadius: 59, borderWidth: 2, borderColor: palette.teal, opacity: burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.4, 0] }), transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.45] }) }] }} />
          {Array.from({ length: 12 }, (_, i) => {
            const angle = i * Math.PI / 6;
            return <Animated.View key={i} style={{ position: "absolute", width: i % 3 === 0 ? 7 : 4, height: i % 3 === 0 ? 7 : 10, borderRadius: 3, backgroundColor: i % 2 ? palette.coral : palette.teal,
              opacity: burst.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 0.8, 0] }),
              transform: [
                { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [Math.cos(angle) * 35, Math.cos(angle) * 82] }) },
                { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [Math.sin(angle) * 35, Math.sin(angle) * 76] }) },
                { rotate: `${i * 30}deg` },
              ],
            }} />;
          })}
        </>}
        <Animated.View style={{ width: 118, height: 118, borderRadius: 59, backgroundColor: kind === "streak" ? palette.warm : palette.mint, borderWidth: 1, borderColor: palette.line, alignItems: "center", justifyContent: "center", gap: 2, transform: [{ scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }, { rotate: entrance.interpolate({ inputRange: [0, 1], outputRange: ["-12deg", "0deg"] }) }] }}>
          {kind === "paws" && <PawMark size={24} />}
          <Copy style={{ fontFamily: serif, color: palette.teal, fontSize: amount > 999 ? 32 : 43, lineHeight: 49 }}>{kind === "paws" ? "+" : ""}{display}</Copy>
          <Copy style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.4, color: palette.teal }}>{kind === "streak" ? "DAY STREAK" : "PAW POINTS"}</Copy>
        </Animated.View>
      </View>
    </View>
  );
}

export function RewardProgress({ total, earned, target }: { total: number; earned: number; target: number }) {
  const { palette } = useRoundsTheme();
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(Math.min(1, total / target))).current;
  useEffect(() => {
    if (reduced) { progress.setValue(Math.min(1, total / target)); return; }
    progress.setValue(Math.max(0, Math.min(1, (total - earned) / target)));
    const animation = Animated.timing(progress, { toValue: Math.min(1, total / target), duration: 950, delay: 350, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [total, earned, target, reduced, progress]);
  return <View accessibilityRole="progressbar" accessibilityLabel="Room progress" accessibilityValue={{ min: 0, max: target, now: Math.min(total, target) }} style={{ height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: palette.line, width: "100%" }}>
    <Animated.View style={{ height: 8, borderRadius: 4, backgroundColor: palette.teal, width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
  </View>;
}
