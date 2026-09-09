import { View } from "react-native";
import type { CatBreed } from "../../domain/interactions";
import { useRoundsTheme } from "./ui";
// Same terracotta, ears and cream muzzle as the room mascot, legible at tab size.
const breedColors: Record<CatBreed, { fur: string; muzzle: string }> = {
  ginger: { fur: "#C98F5C", muzzle: "#F3E3C9" },
  tuxedo: { fur: "#222222", muzzle: "#FFFDF7" },
  siamese: { fur: "#E7D1AD", muzzle: "#5A3B35" },
};
export function MisoMark({
  size = 28,
  breed = "tuxedo",
  name = "Your cat",
}: {
  size?: number;
  breed?: CatBreed;
  name?: string;
}) {
  const { palette } = useRoundsTheme();
  const colors = breedColors[breed];
  return (
    <View
      accessible
      accessibilityLabel={name}
      style={{ width: size, height: size }}
    >
      <View
        style={{
          position: "absolute",
          top: size * 0.12,
          left: size * 0.12,
          width: size * 0.28,
          height: size * 0.38,
          backgroundColor: colors.fur,
          borderRadius: 2,
          transform: [{ rotate: "-14deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          top: size * 0.12,
          right: size * 0.12,
          width: size * 0.28,
          height: size * 0.38,
          backgroundColor: colors.fur,
          borderRadius: 2,
          transform: [{ rotate: "14deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          top: size * 0.25,
          left: size * 0.06,
          width: size * 0.88,
          height: size * 0.68,
          backgroundColor: colors.fur,
          borderRadius: size * 0.38,
        }}
      >
        <View
          style={{
            position: "absolute",
            top: size * 0.26,
            left: size * 0.24,
            width: size * 0.4,
            height: size * 0.25,
            borderRadius: size * 0.2,
            backgroundColor: colors.muzzle,
          }}
        />
        {[0.23, 0.59].map((left) => (
          <View
            key={left}
            style={{
              position: "absolute",
              left: size * left,
              top: size * 0.18,
              width: size * 0.065,
              height: size * 0.09,
              borderRadius: 3,
              backgroundColor: palette.ink,
            }}
          />
        ))}
      </View>
    </View>
  );
}

export function PawMark({ size = 18 }: { size?: number }) {
  const { palette } = useRoundsTheme();
  return (
    <View
      accessible
      accessibilityLabel="Paw Points"
      style={{ width: size, height: size }}
    >
      {[0.05, 0.3, 0.6, 0.8].map((left, i) => (
        <View
          key={left}
          style={{
            position: "absolute",
            left: size * left,
            top: size * (i === 0 || i === 3 ? 0.22 : 0.04),
            width: size * 0.2,
            height: size * 0.25,
            borderRadius: size * 0.12,
            backgroundColor: palette.teal,
          }}
        />
      ))}
      <View
        style={{
          position: "absolute",
          left: size * 0.23,
          top: size * 0.42,
          width: size * 0.57,
          height: size * 0.46,
          borderRadius: size * 0.22,
          backgroundColor: palette.teal,
        }}
      />
    </View>
  );
}
