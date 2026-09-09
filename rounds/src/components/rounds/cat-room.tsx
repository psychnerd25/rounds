import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, View, type ViewStyle } from "react-native";
import { useReducedMotion } from "../../hooks/use-reduced-motion";
import type { CatBreed } from "../../domain/interactions";
import { useRoundsTheme } from "./ui";

const breedColors: Record<CatBreed, { fur: string; muzzle: string; points: string }> = {
  ginger: { fur: "#C98F5C", muzzle: "#F3E3C9", points: "#C98F5C" },
  tuxedo: { fur: "#222222", muzzle: "#FFFDF7", points: "#222222" },
  siamese: { fur: "#E7D1AD", muzzle: "#5A3B35", points: "#5A3B35" },
};

export function CatRoom({
  unlocked,
  breed = "tuxedo",
  name = "Your cat",
  style,
}: {
  unlocked: string[];
  breed?: CatBreed;
  name?: string;
  style?: ViewStyle;
}) {
  const { palette } = useRoundsTheme();
  const float = useRef(new Animated.Value(0)).current;
  const tail = useRef(new Animated.Value(0)).current;
  const sleeping = unlocked.includes("nap");
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      float.setValue(0);
      tail.setValue(0);
      return;
    }
    const motion = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    const swish = Animated.loop(
      Animated.sequence([
        Animated.timing(tail, {
          toValue: 1,
          duration: 1250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(tail, {
          toValue: 0,
          duration: 1250,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    motion.start();
    if (!sleeping) swish.start();
    return () => {
      motion.stop();
      swish.stop();
    };
  }, [float, sleeping, tail, reduced]);
  const has = (item: string) => unlocked.includes(item);
  const cat = breedColors[breed];
  return (
    <View
      accessible
      accessibilityLabel={`${name}’s room with ${unlocked.join(", ")}. ${sleeping ? `${name} is sleeping.` : `${name} is resting.`}`}
      style={[
        {
          height: 300,
          overflow: "hidden",
          borderRadius: 24,
          borderWidth: 1,
          borderColor: palette.line,
          backgroundColor: "#E9E2D2",
        },
        style,
      ]}
    >
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "35%",
          backgroundColor: "#CBB383",
        }}
      />
      {has("plant") && (
        <View
          style={{
            position: "absolute",
            right: 30,
            top: 30,
            alignItems: "center",
          }}
        >
          <View style={{ height: 42, width: 34 }}>
            <View
              style={{
                position: "absolute",
                left: 16,
                width: 3,
                height: 42,
                backgroundColor: palette.teal,
              }}
            />
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  position: "absolute",
                  top: i * 10,
                  left: i % 2 ? 16 : 2,
                  width: 17,
                  height: 10,
                  borderRadius: 10,
                  backgroundColor: i % 2 ? "#78916D" : palette.teal,
                  transform: [{ rotate: i % 2 ? "-25deg" : "25deg" }],
                }}
              />
            ))}
          </View>
          <View
            style={{
              marginTop: -10,
              width: 27,
              height: 11,
              backgroundColor: "#B8735D",
              borderRadius: 3,
            }}
          />
        </View>
      )}
      {has("shelf") && (
        <View
          style={{
            position: "absolute",
            left: 23,
            top: 52,
            width: 105,
            height: 9,
            backgroundColor: "#9E7D59",
            borderRadius: 4,
          }}
        >
          <View
            style={{
              position: "absolute",
              bottom: 9,
              left: 10,
              flexDirection: "row",
              gap: 3,
              alignItems: "flex-end",
            }}
          >
            {["#648E8A", "#B48B50", "#AF735C"].map((color, i) => (
              <View
                key={color}
                style={{
                  width: 14,
                  height: 28 + i * 5,
                  backgroundColor: color,
                  borderRadius: 2,
                  borderTopWidth: 3,
                  borderTopColor: "#FFFAF0",
                }}
              />
            ))}
          </View>
        </View>
      )}
      {has("lamp") && (
        <View
          style={{
            position: "absolute",
            right: 42,
            bottom: 87,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 44,
              height: 24,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              backgroundColor: "#E1B965",
            }}
          />
          <View style={{ width: 4, height: 53, backgroundColor: "#896F56" }} />
          <View
            style={{
              width: 34,
              height: 5,
              borderRadius: 4,
              backgroundColor: "#896F56",
            }}
          />
        </View>
      )}
      {has("cushion") && (
        <View
          style={{
            position: "absolute",
            left: "12%",
            bottom: 41,
            width: 84,
            height: 27,
            borderRadius: 24,
            backgroundColor: "#E8B6A4",
            borderWidth: 1,
            borderColor: palette.coral,
          }}
        />
      )}
      <Animated.View
        style={{
          position: "absolute",
          left: "50%",
          bottom: sleeping ? 50 : 55,
          width: sleeping ? 126 : 96,
          height: 112,
          marginLeft: sleeping ? -63 : -48,
          transform: [
            {
              translateY: float.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -4],
              }),
            },
          ],
        }}
      >
        {!sleeping && (
          <Animated.View
            style={{
              position: "absolute",
              right: 0,
              bottom: 10,
              width: 15,
              height: 48,
              borderRadius: 12,
              backgroundColor: cat.points,
              transformOrigin: "bottom",
              transform: [
                {
                  rotate: tail.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["10deg", "-10deg"],
                  }),
                },
              ],
            }}
          />
        )}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: sleeping ? 7 : 9,
            width: sleeping ? 108 : 78,
            height: sleeping ? 47 : 58,
            borderRadius: 42,
            backgroundColor: cat.fur,
          }}
        >
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: sleeping ? 45 : 23,
              width: 35,
              height: 32,
              borderRadius: 20,
              backgroundColor: cat.muzzle,
            }}
          />
        </View>
        <View
          style={{
            position: "absolute",
            top: sleeping ? 35 : 2,
            left: sleeping ? 10 : 20,
            width: 58,
            height: 51,
            borderRadius: 30,
            backgroundColor: cat.fur,
          }}
        >
          <View
            style={{
              position: "absolute",
              top: -10,
              left: 3,
              width: 20,
              height: 20,
              backgroundColor: cat.points,
              transform: [{ rotate: "45deg" }],
            }}
          />
          <View
            style={{
              position: "absolute",
              top: -10,
              right: 3,
              width: 20,
              height: 20,
              backgroundColor: cat.points,
              transform: [{ rotate: "45deg" }],
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 22,
              left: 14,
              width: 7,
              height: sleeping ? 2 : 9,
              borderRadius: 8,
              backgroundColor: palette.ink,
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 22,
              right: 14,
              width: 7,
              height: sleeping ? 2 : 9,
              borderRadius: 8,
              backgroundColor: palette.ink,
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 32,
              left: 26,
              width: 6,
              height: 5,
              borderRadius: 5,
              backgroundColor: "#A86F42",
            }}
          />
        </View>
      </Animated.View>
    </View>
  );
}
