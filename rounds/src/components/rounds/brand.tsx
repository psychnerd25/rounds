import { Text, View } from "react-native";
import { ExternalLink } from "../external-link";
import { Copy, serif, useRoundsTheme } from "./ui";
import publisher from "../../config/publisher";

export function Brand({ compact = false }: { compact?: boolean }) {
  const { palette } = useRoundsTheme();
  return (
    <View style={{ flexShrink: 1 }}>
      <Copy
        style={{
          fontFamily: serif,
          fontSize: compact ? 29 : 42,
          lineHeight: compact ? 38 : 54,
          letterSpacing: -1,
        }}
      >
        round<Text style={{ color: palette.teal }}>s</Text>
      </Copy>
      <Attribution compact={compact} />
    </View>
  );
}

export function Attribution({ compact = false }: { compact?: boolean }) {
  const { palette } = useRoundsTheme();
  return (
    <ExternalLink
      href={publisher.instagramUrl}
      accessibilityLabel="Made with love by Daily Dose MD. Open Instagram"
      style={{ marginTop: -7, paddingBottom: 4 }}
    >
      <Copy
        style={{
          color: palette.muted,
          fontSize: compact ? 9 : 11,
          lineHeight: compact ? 15 : 18,
        }}
      >
        Made with <Text style={{ color: palette.coral }}>♥</Text> by{" "}
        <Text style={{ color: palette.teal }}>{publisher.name}</Text>
      </Copy>
    </ExternalLink>
  );
}
