import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Modal, Platform, ScrollView, View } from "react-native";
import { useStudy } from "../../state/study";
import { dayKey } from "../../state/progress";
import { nextPawMilestone } from "../../state/paw-points";
import { useReducedMotion } from "../../hooks/use-reduced-motion";
import { Button, Copy, Eyebrow, serif, useRoundsTheme } from "./ui";
import { RewardBurst, RewardProgress } from "./reward-burst";

export function StreakChip() {
  const { palette } = useRoundsTheme();
  const study = useStudy();
  return (
    <View
      accessibilityLabel={`${study.streak} day streak. ${study.todayDone ? "Today complete" : "Today not yet complete"}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: study.todayDone ? palette.mint : palette.warm,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 22,
      }}
    >
      <Copy style={{ fontSize: 12, color: palette.teal, fontWeight: "600" }}>
        {study.todayDone ? "✓" : "◷"} {study.streak}{" "}
        {study.streak === 1 ? "day" : "days"}
      </Copy>
    </View>
  );
}
function CelebrationFrame({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const { palette } = useRoundsTheme();
  const reduced = useReducedMotion();
  const entrance = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!visible || reduced) { entrance.setValue(1); return; }
    entrance.setValue(0);
    const animation = Animated.spring(entrance, { toValue: 1, damping: 18, stiffness: 160, useNativeDriver: Platform.OS !== "web" });
    animation.start();
    return () => animation.stop();
  }, [visible, reduced, entrance]);
  return <Modal transparent visible={visible} animationType={reduced ? "none" : "fade"} onRequestClose={onClose}>
    <ScrollView style={{ flex: 1, backgroundColor: "rgba(10,24,18,.55)" }} contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
      <Animated.View accessibilityViewIsModal style={{ width: "100%", maxWidth: 370, borderRadius: 30, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.white, padding: 24, gap: 16, alignItems: "center", opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }) }] }}>
        {visible && children}
        <Button onPress={onClose} style={{ alignSelf: "stretch", marginTop: 4 }}>Keep learning →</Button>
      </Animated.View>
    </ScrollView>
  </Modal>;
}

export function StreakCelebration() {
  const { palette } = useRoundsTheme();
  const study = useStudy();
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + i);
    return date;
  });
  const close = () => {
    study.dismissCelebration();
    study.dismissPawCelebration();
  };
  return <CelebrationFrame visible={!!study.celebration} onClose={close}>
    <Eyebrow>Today, checked.</Eyebrow>
    <RewardBurst amount={study.celebration?.streak ?? 1} kind="streak" />
    <Copy style={{ fontFamily: serif, fontSize: 29, lineHeight: 36, textAlign: "center" }}>
      {study.celebration?.streak === 1 ? "Your streak starts here." : "Keep the good going."}
    </Copy>
    <Copy style={{ fontSize: 14, textAlign: "center", color: palette.muted }}>One small dose of medicine.{"\n"}One promise to yourself, kept.</Copy>
    <View style={{ flexDirection: "row", gap: 5 }}>
      {days.map(date => {
        const active = study.allActivity.some(e => e.day === dayKey(date));
        const today = dayKey(date) === study.today;
        return <View key={dayKey(date)} style={{ alignItems: "center", gap: 6 }}>
          <View style={{ height: 27, width: 27, borderRadius: 16, backgroundColor: active ? palette.teal : palette.mint, justifyContent: "center", alignItems: "center", borderWidth: today ? 2 : 0, borderColor: palette.coral }}>
            <Copy style={{ fontSize: 12, color: active ? palette.onAccent : palette.muted }}>{active ? "✓" : "·"}</Copy>
          </View>
          <Copy style={{ fontSize: 10, color: palette.muted }}>{date.toLocaleDateString("en", { weekday: "narrow" })}</Copy>
        </View>;
      })}
    </View>
    {study.pawCelebration && <View style={{ alignSelf: "stretch", backgroundColor: palette.mint, borderRadius: 16, padding: 14, gap: 5 }}>
      <Copy style={{ textAlign: "center", fontWeight: "700", color: palette.teal }}>+{study.pawCelebration.amount} Paw Points earned</Copy>
      <Copy style={{ textAlign: "center", color: palette.muted, fontSize: 12 }}>{study.pawCelebration.unlocked ? `${study.preferences.misoName} has something new in the room.` : `A little closer to ${study.preferences.misoName}’s next upgrade.`}</Copy>
    </View>}
  </CelebrationFrame>;
}

export function PawPointsCelebration() {
  const { palette } = useRoundsTheme();
  const study = useStudy();
  const next = nextPawMilestone(study.paws);
  return <CelebrationFrame visible={!!study.pawCelebration && !study.celebration} onClose={study.dismissPawCelebration}>
    <Eyebrow>{study.pawCelebration?.unlocked ? "A new corner of comfort" : "A little effort, rewarded"}</Eyebrow>
    <RewardBurst amount={study.pawCelebration?.amount ?? 0} kind="paws" />
    <Copy style={{ fontFamily: serif, fontSize: 29, lineHeight: 36, textAlign: "center" }}>{study.pawCelebration?.unlocked ? "Look what you unlocked." : "Your study is adding up."}</Copy>
    <Copy style={{ fontSize: 14, textAlign: "center", color: palette.muted }}>{study.pawCelebration?.unlocked ? `${study.preferences.misoName} has something new waiting in the room.` : "Every little round makes the room feel more like home."}</Copy>
    <View style={{ alignSelf: "stretch", padding: 16, borderRadius: 16, backgroundColor: palette.paper, gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Copy style={{ fontSize: 12, fontWeight: "600", flex: 1 }}>{next ? next.name : "The room is complete"}</Copy>
        <Copy style={{ fontSize: 12, color: palette.teal }}>{study.paws.total}{next ? ` / ${next.at}` : " paws"}</Copy>
      </View>
      {next && <RewardProgress total={study.paws.total} earned={study.pawCelebration?.amount ?? 0} target={next.at} />}
      {next && <Copy style={{ fontSize: 12, color: palette.muted }}>{next.at - study.paws.total} paws to your next upgrade</Copy>}
    </View>
  </CelebrationFrame>;
}
