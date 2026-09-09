import { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import type { RevisionCard } from "../../domain/content";
import { Copy, useRoundsTheme } from "./ui";
export function CardReferences({ card }: { card: RevisionCard }) {
  const { palette, s } = useRoundsTheme();
  const [failed, setFailed] = useState(false);
  const references = card.references.length
    ? card.references
    : card.source
      ? [card.source]
      : [];
  return (
    <View style={{ gap: 10 }}>
      {references.length ? (
        references.map((reference) => (
          <Pressable
            key={reference.id || reference.url}
            accessibilityRole="link"
            style={{ minHeight: 44, justifyContent: "center" }}
            onPress={() => {
              if (!/^https?:\/\//.test(reference.url)) {
                setFailed(true);
                return;
              }
              Linking.openURL(reference.url).catch(() => setFailed(true));
            }}
          >
            <Copy
              style={{
                color: palette.teal,
                fontSize: 13,
                textDecorationLine: "underline",
              }}
            >
              {reference.title} ↗
            </Copy>
          </Pressable>
        ))
      ) : (
        <Copy style={s.muted}>
          From the Rounds content bank · references pending editorial review.
        </Copy>
      )}
      {failed && (
        <Copy style={s.muted}>
          Could not open the reference. Try again when connected.
        </Copy>
      )}
    </View>
  );
}
