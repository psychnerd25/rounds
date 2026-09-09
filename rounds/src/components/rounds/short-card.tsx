import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import type { RevisionCard } from "../../domain/content";
import { useContent } from "../../state/content";
import { useReducedMotion } from "../../hooks/use-reduced-motion";
import { useStudy } from "../../state/study";
import { Button, Copy, Eyebrow, serif, useRoundsTheme } from "./ui";

export function ShortCard({
  card,
  recall,
  revealed,
  onReveal,
  onOpen,
}: {
  card: RevisionCard;
  recall: boolean;
  revealed: boolean;
  onReveal: () => void;
  onOpen?: () => void;
}) {
  const { palette, s } = useRoundsTheme();
  const { subjects } = useContent();
  const study = useStudy();
  const [details, setDetails] = useState(false);
  const subjectName =
    subjects.find((subject) => subject.id === card.subjectId)?.name ?? card.subjectId;
  const [cardHeight, setCardHeight] = useState(500);
  const small = cardHeight < 550;
  const reduced = useReducedMotion();
  const dark = recall && revealed;
  const ink = dark ? "#FFFAF0" : palette.ink;

  return (
    <View
      onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
      style={{
        flex: 1,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: dark ? palette.teal : palette.line,
        backgroundColor: dark ? "#214E43" : palette.white,
        overflow: "hidden",
        boxShadow: "0px 10px 25px rgba(60,45,20,.06)",
      }}
    >
      <View
        style={[
          s.between,
          { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
        ]}
      >
        <View
          style={{
            flexShrink: 1,
            backgroundColor: dark ? "#3E6759" : palette.mint,
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 5,
          }}
        >
          <Copy
            style={{
              color: dark ? "#FFFAF0" : palette.teal,
              fontSize: 11,
              fontWeight: "600",
            }}
          >
            {subjectName}
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
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Copy style={{ color: ink, fontSize: 24, lineHeight: 28 }}>
            {study.saved.includes(card.id) ? "◆" : "◇"}
          </Copy>
        </Pressable>
      </View>

      <ScrollView
        nestedScrollEnabled
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingBottom: 10,
          gap: small ? 9 : 15,
          flexGrow: 1,
        }}
      >
        <Copy
          style={{
            fontFamily: serif,
            color: ink,
            fontSize: small ? 25 : 29,
            lineHeight: small ? 31 : 36,
            letterSpacing: -0.5,
          }}
        >
          {recall && !revealed ? card.prompt : card.title}
        </Copy>

        {recall && !revealed ? (
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              gap: 18,
              paddingBottom: 12,
              paddingTop: 30,
            }}
          >
            <Copy style={{ color: palette.muted, fontSize: 13 }}>
              Make the call in your mind.{"\n"}Then turn the card over.
            </Copy>
            <Button onPress={onReveal}>Reveal the answer ↗</Button>
          </View>
        ) : (
          <>
            <View
              style={{
                width: 32,
                height: 2,
                backgroundColor: dark ? "#759A83" : "#C6AF7D",
              }}
            />
            <View style={{ gap: small ? 9 : 13 }}>
              {card.facts.map((fact, index) => (
                <View key={`${index}:${fact}`} style={{ flexDirection: "row", gap: 12 }}>
                  <Copy
                    style={{
                      color: dark ? "#A7C4AF" : palette.coral,
                      fontSize: 10,
                      marginTop: 1,
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </Copy>
                  <Copy
                    style={{
                      flex: 1,
                      fontSize: small ? 15 : 16,
                      lineHeight: small ? 23 : 25,
                      color: ink,
                    }}
                  >
                    {fact}
                  </Copy>
                </View>
              ))}
            </View>
            <View
              style={{
                backgroundColor: dark ? "#345E50" : palette.mint,
                borderRadius: 12,
                padding: small ? 12 : 15,
                gap: 5,
                marginTop: "auto",
              }}
            >
              <Copy
                style={{
                  color: dark ? "#CEE0D0" : palette.teal,
                  fontSize: 9,
                  fontWeight: "700",
                  letterSpacing: 1.4,
                }}
              >
                THE CLINICAL PEARL
              </Copy>
              <Copy
                style={{
                  color: ink,
                  fontFamily: serif,
                  fontSize: small ? 17 : 19,
                  lineHeight: small ? 23 : 26,
                }}
              >
                {card.pearl}
              </Copy>
            </View>
          </>
        )}
      </ScrollView>

      <View
        style={[
          s.between,
          {
            borderTopWidth: 1,
            borderColor: dark ? "#3B6555" : palette.line,
            paddingHorizontal: 20,
            paddingVertical: 6,
          },
        ]}
      >
        <Copy style={{ color: dark ? "#BFD0C3" : palette.muted, fontSize: 9 }}>
          ROUNDS
        </Copy>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open full card"
          onPress={() => {
            onOpen?.();
            setDetails(true);
          }}
          disabled={recall && !revealed}
          style={{
            minHeight: 44,
            justifyContent: "center",
            opacity: recall && !revealed ? 0.35 : 1,
          }}
        >
          <Copy style={{ color: ink, fontSize: 11 }}>Full card ↗</Copy>
        </Pressable>
      </View>

      <Modal
        visible={details}
        transparent
        animationType={reduced ? "none" : "fade"}
        onRequestClose={() => setDetails(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 22,
            backgroundColor: "rgba(30,48,40,.4)",
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              maxWidth: 520,
              width: "100%",
              maxHeight: "85%",
              backgroundColor: palette.white,
              borderRadius: 24,
              padding: 24,
              gap: 18,
            }}
          >
            <Eyebrow>{subjectName}</Eyebrow>
            <ScrollView contentContainerStyle={{ gap: 18 }}>
              <Copy style={{ fontFamily: serif, fontSize: 27, lineHeight: 34 }}>
                {card.title}
              </Copy>
              {card.facts.map((fact, index) => (
                <Copy key={`${index}:${fact}`}>{fact}</Copy>
              ))}
              <View style={{ gap: 6 }}>
                <Eyebrow>Clinical pearl</Eyebrow>
                <Copy style={{ fontFamily: serif, fontSize: 21, lineHeight: 28 }}>
                  {card.pearl}
                </Copy>
              </View>
              <Copy style={{ fontSize: 11, color: palette.muted }}>
                Educational content for revision. Use local clinical protocols
                and supervision for patient care.
              </Copy>
            </ScrollView>
            <Button onPress={() => setDetails(false)}>Back to my round</Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}
