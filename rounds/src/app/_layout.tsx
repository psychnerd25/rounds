import { AppearanceProvider } from "../state/appearance";
import { Slot, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StudyProvider, useStudy } from "../state/study";
import { ContentProvider } from "../state/content";
import { contentRepository } from "../backend/content-repository";
import { Onboarding } from "../features/onboarding";
import { MisoMark } from "../components/rounds/miso-mark";
import { AppErrorBoundary } from "../components/rounds/error-boundary";
import { Brand } from "../components/rounds/brand";
import {
  PawPointsCelebration,
  StreakCelebration,
  StreakChip,
} from "../components/rounds/streak-celebration";
import { Copy, serif, useRoundsTheme } from "../components/rounds/ui";
SplashScreen.preventAutoHideAsync();
const tabs = [
  { id: "feed", label: "Feed", path: "/" as const, icon: "▤" },
  { id: "topics", label: "Topics", path: "/topics" as const, icon: "⊞" },
  { id: "saved", label: "Saved", path: "/saved" as const, icon: "◇" },
  { id: "progress", label: "Progress", path: "/progress" as const, icon: "▥" },
  { id: "cat", label: "Cat", path: "/cat" as const, icon: "♧" },
  { id: "settings", label: "Settings", path: "/settings" as const, icon: "⚙" },
];
function Shell() {
  const { palette, s, mode } = useRoundsTheme();
  const path = usePathname(),
    wide = useWindowDimensions().width >= 900,
    study = useStudy();
  const navigation = tabs.map((tab) => (
    <Pressable
      key={tab.id}
      accessibilityRole="tab"
      accessibilityState={{ selected: path === tab.path }}
      onPress={() => router.navigate(tab.path)}
      style={{
        flexDirection: wide ? "row" : "column",
        gap: wide ? 12 : 2,
        alignItems: "center",
        padding: wide ? 13 : 8,
        flex: wide ? undefined : 1,
        borderRadius: 12,
        backgroundColor: path === tab.path ? palette.mint : "transparent",
      }}
    >
      {tab.id === "cat" ? (
        <MisoMark
          breed={study.preferences.misoBreed}
          name={study.preferences.misoName}
        />
      ) : (
        <Copy
          style={{
            fontSize: 23,
            lineHeight: 28,
            height: 28,
            color: path === tab.path ? palette.teal : palette.muted,
          }}
        >
          {tab.icon}
        </Copy>
      )}
      <Copy
        style={{
          fontSize: wide ? 14 : 10,
          fontWeight: path === tab.path ? "700" : "400",
        }}
      >
        {tab.id === "cat" ? study.preferences.misoName : tab.label}
      </Copy>
      {wide && tab.id === "saved" && (
        <Copy style={{ marginLeft: "auto", fontSize: 12 }}>
          {study.saved.length}
        </Copy>
      )}
      {tab.id === "cat" && study.paws.unseenUnlocked.length > 0 && (
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: palette.coral,
          }}
        />
      )}
    </Pressable>
  ));
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.paper }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <View style={{ flex: 1, flexDirection: "row" }}>
        {wide && (
          <View
            style={{
              width: 228,
              padding: 28,
              borderRightWidth: 1,
              borderColor: palette.line,
            }}
          >
            <Brand />
            <View style={{ gap: 9, marginTop: 62 }}>{navigation}</View>
            <View style={{ marginTop: "auto", gap: 12 }}>
              <View style={{ height: 1, backgroundColor: palette.line }} />
              <Copy style={{ fontFamily: serif, fontSize: 19 }}>
                Small pockets.{"\n"}Real progress.
              </Copy>
              <Copy style={s.muted}>A little medicine, every day.</Copy>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/settings")}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Copy>Settings & tour</Copy>
              </Pressable>
            </View>
          </View>
        )}
        <View style={{ flex: 1 }}>
          {!wide && (
            <View
              style={[
                s.between,
                { paddingHorizontal: 23, paddingTop: 8, paddingBottom: 10 },
              ]}
            >
              <Brand compact />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View your streak"
                onPress={() => router.push("/progress")}
              >
                <StreakChip />
              </Pressable>
            </View>
          )}
          {study.error ? (
            <Pressable
              accessibilityRole="button"
              onPress={study.retryPersistence}
              style={{ padding: 12 }}
            >
              <Copy style={{ color: "#964D39", fontSize: 12 }}>
                {study.error} Tap to retry.
              </Copy>
            </Pressable>
          ) : null}
          {study.ready ? (
            study.onboarding.completedAt ? (
              <Slot />
            ) : (
              <Onboarding
                onFinish={(skipped) =>
                  study.dispatch({ kind: "onboard", skipped })
                }
              />
            )
          ) : (
            <Copy style={{ padding: 40 }}>Preparing your rounds…</Copy>
          )}
          <StreakCelebration />
          <PawPointsCelebration />
          {!wide && (
            <View
              style={{
                flexDirection: "row",
                padding: 8,
                backgroundColor: palette.white,
                borderTopWidth: 1,
                borderColor: palette.line,
              }}
            >
              {navigation}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
export default function Layout() {
  const [fontsLoaded, fontError] = useFonts({
    "Fraunces-SemiBold": require("../../assets/fonts/Fraunces-SemiBold.ttf"),
    "Inter-Regular": require("../../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../../assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("../../assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("../../assets/fonts/Inter-Bold.ttf"),
  });
  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);
  if (!fontsLoaded && !fontError) return null;

  return (
    <AppearanceProvider>
    <AppErrorBoundary>
      <SafeAreaProvider>
        <ContentProvider repository={contentRepository}>
          <StudyProvider>
            <Shell />
          </StudyProvider>
        </ContentProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
    </AppearanceProvider>
  );
}
