import { isAvailableCard } from "../domain/ranking";
import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useContent } from "../state/content";
import { useStudy } from "../state/study";
import { Button, Copy, Eyebrow, Panel, serif, useRoundsTheme } from "../components/rounds/ui";
export default function Library({ saved = false }: { saved?: boolean }) {
  const { palette, s } = useRoundsTheme();
  const { cards: catalogCards, subjects } = useContent();
  const cards = catalogCards.filter(c => isAvailableCard(c));
  const study = useStudy(),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(null);
  const match = (text: string) =>
    text.toLowerCase().includes(query.trim().toLowerCase());
  const savedCards = cards.filter(
    (c) => study.saved.includes(c.id) && match(`${c.title} ${c.topic}`),
  );
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 26,
        maxWidth: 950,
        width: "100%",
        alignSelf: "center",
        gap: 24,
      }}
    >
      <Eyebrow>
        {saved ? "Your personal collection" : "Explore the essentials"}
      </Eyebrow>
      <Copy style={s.title}>
        {saved ? "Worth another look." : "Find your focus."}
      </Copy>
      <Copy style={s.muted}>
        {saved
          ? "The concepts you want to keep close. Saved on this device."
          : "A rotation at a time. A stronger foundation with every round."}
      </Copy>
      <TextInput
        accessibilityLabel={
          saved ? "Search saved cards" : "Search rotations and topics"
        }
        value={query}
        onChangeText={setQuery}
        placeholder={
          saved ? "Search your saved cards…" : "Search rotations or topics…"
        }
        placeholderTextColor={palette.muted}
        style={{
          padding: 16,
          backgroundColor: palette.white,
          borderWidth: 1,
          borderColor: palette.line,
          borderRadius: 12,
          fontSize: 14,
          color: palette.ink,
        }}
      />
      {saved ? (
        <>
          <View style={s.between}>
            <Eyebrow>{study.saved.length} saved cards</Eyebrow>
            <Button
              disabled={!savedCards.length}
              onPress={() =>
                router.push({ pathname: "/", params: { collection: "saved", mode: "recall" } })
              }
            >
              Review saved →
            </Button>
          </View>
          {savedCards.map((card) => (
            <Panel key={card.id} style={{ gap: 14 }}>
              <Eyebrow>
                {subjects.find((s) => s.id === card.subjectId)?.name}
              </Eyebrow>
              <Copy style={{ fontFamily: serif, fontSize: 25, lineHeight: 32 }}>
                {card.title}
              </Copy>
              <Copy style={s.muted}>{card.topic}</Copy>
              <View style={s.between}>
                <Button
                  subtle
                  onPress={() =>
                    router.push({
                      pathname: "/",
                      params: { collection: "saved", card: card.id },
                    })
                  }
                >
                  Practice card ↗
                </Button>
                <Button
                  subtle
                  label={`Unsave ${card.title}`}
                  onPress={() => study.toggleSaved(card.id)}
                >
                  Unsave
                </Button>
              </View>
            </Panel>
          ))}
          {!savedCards.length && (
            <Panel style={{ gap: 18 }}>
              <Copy style={{ fontFamily: serif, fontSize: 25 }}>
                {query ? "No matching cards." : "Keep the useful ones."}
              </Copy>
              <Copy style={s.muted}>
                {query
                  ? "Try a different topic or clear your search."
                  : "Tap the bookmark on any revision card to save it here."}
              </Copy>
              <Button onPress={() => (query ? setQuery("") : router.push("/"))}>
                {query ? "Clear search" : "Find a card to save"}
              </Button>
            </Panel>
          )}
        </>
      ) : (
        <>
          {subjects
            .filter((sub) => match(`${sub.name} ${sub.topics.join(" ")}`))
            .map((sub) => (
              <Panel key={sub.id} style={{ padding: 0, overflow: "hidden" }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: selected === sub.id }}
                  onPress={() =>
                    setSelected(selected === sub.id ? null : sub.id)
                  }
                  style={[s.between, { padding: 24 }]}
                >
                  <View style={[s.row, { flex: 1 }]}>
                    <View
                      style={{
                        width: 49,
                        height: 49,
                        backgroundColor: palette.paper,
                        borderRadius: 14,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Copy
                        style={{
                          color: sub.color,
                          fontSize: 30,
                          lineHeight: 36,
                        }}
                      >
                        {sub.symbol}
                      </Copy>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Copy
                        style={{
                          fontFamily: serif,
                          fontSize: 24,
                          lineHeight: 31,
                        }}
                      >
                        {sub.name}
                      </Copy>
                      <Copy style={s.muted}>
                        {sub.topics.length
                          ? `${sub.topics.length} topics · ${cards.filter((c) => c.subjectId === sub.id).length} cards`
                          : "Content in preparation"}
                      </Copy>
                    </View>
                  </View>
                  <Copy>{selected === sub.id ? "−" : "+"}</Copy>
                </Pressable>
                {selected === sub.id && (
                  <View style={{ padding: 24, paddingTop: 0, gap: 12 }}>
                    {sub.topics.length ? (
                      sub.topics.map((topic) => (
                        <Button
                          key={topic}
                          subtle
                          onPress={() =>
                            router.push({
                              pathname: "/",
                              params: { subject: sub.id, topic },
                            })
                          }
                        >
                          {topic} ↗
                        </Button>
                      ))
                    ) : (
                      <Copy style={s.muted}>
                        This rotation is ready for a curated collection. No
                        cards have been added yet.
                      </Copy>
                    )}
                  </View>
                )}
              </Panel>
            ))}
          {!subjects.some((sub) =>
            match(`${sub.name} ${sub.topics.join(" ")}`),
          ) && <Copy>No rotations match your search.</Copy>}
          <Copy style={{ color: palette.muted, fontSize: 11 }}>
            A growing library from Rounds by dailydose.md_.
          </Copy>
        </>
      )}
    </ScrollView>
  );
}
