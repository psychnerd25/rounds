import { useState } from "react";
import { CardReferences } from "./card-references";
import {
  Platform,
  type ViewStyle,
  Pressable,
  View,
  useWindowDimensions,
  type GestureResponderHandlers,
} from "react-native";
import type { RevisionCard, Recall } from "../../domain/content";
import { useContent } from "../../state/content";
import { useStudy } from "../../state/study";
import { Button, Copy, Eyebrow, Panel, serif, useRoundsTheme } from "./ui";
export function RevisionCardView({
  card,
  recall,
  onRated,
  rated,
  swipeHandlers,
}: {
  card: RevisionCard;
  recall: boolean;
  onRated: (rating: Recall) => void;
  rated: boolean;
  swipeHandlers?: GestureResponderHandlers;
}) {
  const { palette, s } = useRoundsTheme();
  const [revealed, setRevealed] = useState(false),
    [expanded, setExpanded] = useState(false);
  const { subjects } = useContent();
  const study = useStudy(),
    subject = subjects.find((s) => s.id === card.subjectId)!;
  const mobile = useWindowDimensions().width < 600;
  const answerVisible = !recall || revealed;
  return (
    <Panel
      style={{
        padding: 0,
        overflow: "hidden",
        boxShadow: "0px 8px 28px rgba(35,62,47,0.035)",
      }}
    >
      <View
        style={[
          s.between,
          {
            paddingHorizontal: 25,
            paddingVertical: mobile ? 10 : 17,
            borderBottomWidth: 1,
            borderColor: palette.line,
          },
        ]}
      >
        <View style={s.row}>
          <View
            style={{
              backgroundColor: palette.rose,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 7,
            }}
          >
            <Copy
              style={{ color: subject.color, fontSize: 11, fontWeight: "600" }}
            >
              {subject.symbol} {subject.name}
            </Copy>
          </View>
          <Copy style={{ color: palette.muted, fontSize: 11 }}>
            {card.seconds} sec read
          </Copy>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            study.saved.includes(card.id) ? "Unsave card" : "Save card"
          }
          accessibilityState={{ selected: study.saved.includes(card.id) }}
          onPress={() => study.toggleSaved(card.id)}
          style={{
            width: 44,
            height: 44,
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Copy style={{ color: palette.teal, fontSize: 22, lineHeight: 28 }}>
            {study.saved.includes(card.id) ? "◆" : "◇"}
          </Copy>
        </Pressable>
      </View>
      <View style={{ padding: mobile ? 20 : 26, gap: mobile ? 15 : 20 }}>
        <View style={s.between}>
          <Eyebrow>{card.series}</Eyebrow>
          <Copy style={{ fontSize: 9, color: palette.muted, letterSpacing: 1 }}>
            CLINICAL CARD
          </Copy>
        </View>
        <View
          {...swipeHandlers}
          style={
            Platform.OS === "web"
              ? ({ touchAction: "none" } as ViewStyle)
              : undefined
          }
        >
          <Copy
            style={{
              fontFamily: serif,
              fontSize: mobile ? 26 : 30,
              lineHeight: mobile ? 35 : 40,
              letterSpacing: -0.5,
            }}
          >
            {card.prompt}
          </Copy>
        </View>
        {!answerVisible && (
          <View
            style={{ paddingVertical: mobile ? 8 : 18, gap: mobile ? 12 : 18 }}
          >
            <View
              style={{ width: 40, height: 2, backgroundColor: "#B7C9BC" }}
            />
            <Copy style={{ color: palette.muted, fontSize: 14 }}>
              Pause for a moment. Make the call in your mind.
            </Copy>
            <Button onPress={() => setRevealed(true)}>
              Reveal the answer ↗
            </Button>
          </View>
        )}
        {answerVisible && (
          <View style={{ gap: 18 }} accessibilityLiveRegion="polite">
            <View style={{ height: 1, backgroundColor: palette.line }} />
            <Eyebrow>{card.title} · The essentials</Eyebrow>
            {card.facts.map((fact, i) => (
              <View key={fact} style={{ flexDirection: "row", gap: 13 }}>
                <Copy style={{ color: "#8D9B8B", fontSize: 11, marginTop: 2 }}>
                  0{i + 1}
                </Copy>
                <Copy style={{ flex: 1, fontSize: 14, lineHeight: 22 }}>
                  {fact}
                </Copy>
              </View>
            ))}
            <View
              style={{
                padding: 17,
                backgroundColor: palette.mint,
                borderRadius: 12,
                gap: 6,
              }}
            >
              <Eyebrow>✧ Clinical pearl</Eyebrow>
              <Copy
                style={{
                  color: palette.teal,
                  fontFamily: serif,
                  fontSize: 19,
                  lineHeight: 27,
                }}
              >
                {card.pearl}
              </Copy>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setExpanded(!expanded)}
              style={{ paddingVertical: 7 }}
            >
              <Copy
                style={{ fontSize: 12, color: palette.teal, fontWeight: "600" }}
              >
                {expanded ? "−" : "+"}{" "}
                {expanded ? "Less detail" : "Understand the why"}
              </Copy>
            </Pressable>
            {expanded && (
              <View style={{ gap: 12 }}>
                <Copy style={{ fontSize: 13 }}>{card.explanation}</Copy>
                <CardReferences card={card} />
                <Copy style={{ fontSize: 10, color: palette.muted }}>
                  Educational content for revision. Use local clinical protocols
                  and supervision for patient care.
                </Copy>
              </View>
            )}
          </View>
        )}
      </View>
      {answerVisible && (
        <View
          style={{
            padding: 20,
            borderTopWidth: 1,
            borderColor: palette.line,
            gap: 12,
          }}
        >
          <Copy
            style={{ textAlign: "center", fontSize: 11, color: palette.muted }}
          >
            {rated
              ? "✓ Recall recorded · ready for the next card"
              : "How well did you know this?"}
          </Copy>
          <View style={{ flexDirection: "row", gap: 7 }}>
            {(
              [
                { rating: "again", label: "Didn't know", color: palette.rose },
                {
                  rating: "partial",
                  label: "Partially knew",
                  color: palette.warm,
                },
                { rating: "known", label: "Knew it", color: palette.mint },
              ] as const
            ).map((item) => (
              <Button
                key={item.rating}
                disabled={rated}
                subtle
                onPress={() => onRated(item.rating)}
                style={{
                  flex: 1,
                  paddingHorizontal: 4,
                  backgroundColor: item.color,
                }}
              >
                {item.label}
              </Button>
            ))}
          </View>
        </View>
      )}
    </Panel>
  );
}
