import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { ReactNode } from "react";
import { isLoaded } from "expo-font";
import { palettes, useAppearance } from "../../state/appearance";
export const serif = "Fraunces-SemiBold";
const fallbackSerif =
  Platform.OS === "ios"
    ? "Georgia"
    : Platform.OS === "web"
      ? "Georgia, serif"
      : "serif";
export function Copy({
  children,
  style,
}: {
  children: ReactNode;
  style?: TextStyle | TextStyle[];
}) {
  const { s } = useRoundsTheme();
  const resolved = StyleSheet.flatten([s.copy, style]);
  const weight =
    resolved.fontWeight === "bold" ? 700 : Number(resolved.fontWeight ?? 400);
  const family =
    resolved.fontFamily ??
    (weight >= 700
      ? "Inter-Bold"
      : weight >= 600
        ? "Inter-SemiBold"
        : weight >= 500
          ? "Inter-Medium"
          : "Inter-Regular");
  const bundled = family === serif || family.startsWith("Inter-");
  return (
    <Text
      style={[
        resolved,
        bundled &&
          (isLoaded(family)
            ? { fontFamily: family, fontWeight: "normal" }
            : { fontFamily: family === serif ? fallbackSerif : undefined }),
      ]}
    >
      {children}
    </Text>
  );
}
export function Eyebrow({ children }: { children: ReactNode }) {
  const { s } = useRoundsTheme();
  return <Copy style={s.eyebrow}>{children}</Copy>;
}
export function Button({
  children,
  onPress,
  subtle,
  disabled,
  label,
  style,
}: {
  children: ReactNode;
  onPress: () => void;
  subtle?: boolean;
  disabled?: boolean;
  label?: string;
  style?: ViewStyle;
}) {
  const { palette, s } = useRoundsTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        subtle && s.subtle,
        style,
        { opacity: disabled ? 0.35 : pressed ? 0.65 : 1 },
      ]}
    >
      <Copy
        style={{
          color: subtle ? palette.teal : palette.onAccent,
          fontWeight: "600",
          fontSize: 13,
        }}
      >
        {children}
      </Copy>
    </Pressable>
  );
}
export function Panel({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  const { s } = useRoundsTheme();
  return <View style={[s.panel, style]}>{children}</View>;
}
const createStyles = (palette: typeof palettes.light) => StyleSheet.create({
  copy: { color: palette.ink, fontSize: 15, lineHeight: 23 },
  eyebrow: {
    color: palette.muted,
    fontSize: 10,
    letterSpacing: 1.7,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  button: {
    backgroundColor: palette.teal,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  subtle: { backgroundColor: palette.mint },
  panel: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 20,
    padding: 24,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { fontFamily: serif, fontSize: 38, lineHeight: 45, letterSpacing: -1 },
  muted: { color: palette.muted, fontSize: 13 },
});

const styles = { light: createStyles(palettes.light), dark: createStyles(palettes.dark) };
export function useRoundsTheme() {
  const { mode } = useAppearance();
  return { palette: palettes[mode], s: styles[mode], mode };
}
