import { Pressable, View } from "react-native";
import { palettes, useAppearance, type AppearanceMode } from "../../state/appearance";
import { Copy, Eyebrow, Panel, useRoundsTheme } from "./ui";

export function AppearancePicker() {
  const { mode, setMode, error } = useAppearance();
  const { palette, s } = useRoundsTheme();
  return (
    <Panel style={{ gap: 18 }}>
      <View style={{ gap: 6 }}>
        <Eyebrow>Appearance</Eyebrow>
        <Copy style={{ fontSize: 20, fontWeight: "600" }}>A little easier on the eyes.</Copy>
        <Copy style={s.muted}>Choose the light for your daily rounds.</Copy>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={{ flexDirection: "row", gap: 12 }}>
        {(["light", "dark"] as AppearanceMode[]).map(option => {
          const colors = palettes[option];
          const selected = mode === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={`${option === "light" ? "Light" : "Dark"} mode`}
              aria-checked={selected}
              onPress={() => setMode(option)}
              style={({ pressed }) => ({
                flex: 1, minWidth: 0, padding: 6, borderRadius: 18, borderWidth: 2,
                borderColor: selected ? palette.teal : palette.line,
                backgroundColor: selected ? palette.mint : palette.white,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ backgroundColor: colors.paper, borderRadius: 11, padding: 14, height: 110, gap: 11, overflow: "hidden" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.teal }} />
                  <View style={{ width: "45%", height: 5, borderRadius: 3, backgroundColor: colors.ink, opacity: 0.7 }} />
                </View>
                <View style={{ backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1, borderRadius: 9, padding: 10, gap: 7 }}>
                  <View style={{ width: "75%", height: 5, borderRadius: 3, backgroundColor: colors.ink }} />
                  <View style={{ width: "95%", height: 4, borderRadius: 3, backgroundColor: colors.muted, opacity: 0.5 }} />
                  <View style={{ width: "40%", height: 10, borderRadius: 4, backgroundColor: colors.mint }} />
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 10, gap: 4 }}>
                <Copy style={{ fontSize: 14, fontWeight: "600" }}>{option === "light" ? "Light" : "Dark"}</Copy>
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: selected ? 0 : 1, borderColor: palette.line, backgroundColor: selected ? palette.teal : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {selected && <Copy style={{ color: palette.onAccent, fontSize: 12, lineHeight: 18 }}>✓</Copy>}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Copy style={{ fontSize: 12, color: error ? palette.coral : palette.muted }}>
        {error || (mode === "light" ? "Warm paper tones for a brighter day." : "Soft greens for your evening rounds.")}
      </Copy>
    </Panel>
  );
}
