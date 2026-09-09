import { ScrollView } from "react-native";
import { router } from "expo-router";
import { useContent } from "../state/content";
import { useStudy } from "../state/study";
import { isAvailableCard, localRecommendations, reviewStatus } from "../domain/ranking";
import { Button, Copy, Eyebrow, Panel, useRoundsTheme } from "../components/rounds/ui";
export default function Review() {
  const { s } = useRoundsTheme();
  const study = useStudy(),
    { cards } = useContent(),
    now = new Date();
  const due = localRecommendations.rank(cards, study, {
    now,
    mode: "review",
    limit: 10,
  });
  const scheduled = cards
    .filter(c => isAvailableCard(c, now) && c.prompt)
    .map((c) => reviewStatus(c, study, now).dueAt)
    .filter((at): at is string => !!at && Date.parse(at) > now.getTime())
    .sort();
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 26,
        gap: 20,
        maxWidth: 720,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <Eyebrow>Remember what matters</Eyebrow>
      <Copy style={s.title}>Smart Review.</Copy>
      <Copy>
        Revisit due concepts, updated cards, and cards ready for a first recall.
        Honest ratings guide your next round.
      </Copy>
      {due.length ? (
        <>
          <Button
            onPress={() =>
              router.push({
                pathname: "/",
                params: { collection: "review", mode: "recall" },
              })
            }
          >
            Review {due.length} cards →
          </Button>
          {due.map((c) => (
            <Panel key={c.id} style={{ gap: 8 }}>
              <Copy>{c.title}</Copy>
              <Copy style={s.muted}>{reviewStatus(c, study, now).reason}</Copy>
            </Panel>
          ))}
        </>
      ) : (
        <Panel style={{ gap: 15 }}>
          <Copy>Nothing due right now.</Copy>
          <Copy style={s.muted}>
            {scheduled[0]
              ? `Your next review is scheduled for ${new Date(scheduled[0]).toLocaleDateString()}.`
              : "Save a useful card or try recall in Discovery to build your review list."}
          </Copy>
          <Button onPress={() => router.push("/")}>Discover a concept →</Button>
        </Panel>
      )}
      <Copy style={s.muted}>
        A simple starting schedule: “Didn't know” returns after 1 day,
        “Partially knew” after 2, “Knew it” after 7. These are practice
        intervals, not a validated measure of mastery.
      </Copy>
    </ScrollView>
  );
}
