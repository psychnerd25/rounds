import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useStudy } from "../state/study";
import { useContent } from "../state/content";
import { dayKey } from "../state/progress";
import { isWeakCard } from "../domain/ranking";
import { Button, Copy, Eyebrow, Panel, serif, useRoundsTheme } from "../components/rounds/ui";
export default function Progress() {
  const { palette, s } = useRoundsTheme();
  const { cards, subjects } = useContent();
  const study = useStudy(),
    practiced = cards.filter((c) =>
      study.allActivity.some((e) => e.cardId === c.id),
    );
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return d;
  });
  const weak = cards.filter(
    (c) => isWeakCard(c, study),
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
      <Eyebrow>Your learning, taking shape</Eyebrow>
      <Copy style={s.title}>Small steps.{"\n"}Lasting knowledge.</Copy>
      <Copy style={s.muted}>
        An honest picture of your practice, saved on this device.
      </Copy>
      <Button onPress={() => router.push("/review")}>
        Start Smart Review →
      </Button>
      <Copy style={s.muted}>
        {study.sessions.filter((session) => session.completedAt).length} rounds
        completed. Every card in a round must be completed to count.
      </Copy>
      <Panel style={{ backgroundColor: palette.mint, gap: 19 }}>
        <Eyebrow>
          {study.todayDone
            ? "✓ Today is checked"
            : "Your next little dose starts today"}
        </Eyebrow>
        <View style={s.row}>
          <Copy style={{ fontFamily: serif, fontSize: 64, lineHeight: 74 }}>
            {study.streak}
          </Copy>
          <Copy style={{ fontFamily: serif, fontSize: 23 }}>
            {study.streak === 1 ? "day" : "days"} of showing up
          </Copy>
        </View>
        <View style={s.between}>
          {days.map((date) => {
            const active = study.allActivity.some(
              (e) => e.day === dayKey(date),
            );
            return (
              <View key={dayKey(date)} style={{ gap: 7, alignItems: "center" }}>
                <View
                  style={{
                    width: 31,
                    height: 31,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: active ? palette.teal : palette.mint,
                    borderWidth: dayKey(date) === study.today ? 1 : 0,
                    borderColor: palette.teal,
                  }}
                >
                  <Copy
                    style={{
                      color: active ? palette.onAccent : palette.muted,
                      fontSize: 12,
                    }}
                  >
                    {active ? "✓" : date.getDate()}
                  </Copy>
                </View>
                <Copy style={{ fontSize: 10, color: palette.muted }}>
                  {date.toLocaleDateString("en", { weekday: "narrow" })}
                </Copy>
              </View>
            );
          })}
        </View>
        <Copy style={s.muted}>
          Last 7 days · mark a short as read or complete a recall card to earn
          today’s check.
        </Copy>
      </Panel>
      <Copy style={s.muted}>
        {study.shortsToday} shorts read · {study.recallsToday} recall cards
        completed today
      </Copy>
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        {[
          { value: `${study.reviewed}`, label: "Concepts today" },
          {
            value: study.accuracy === null ? "—" : `${study.accuracy}%`,
            label: "Self-rated recall",
          },
          {
            value: `${new Set(practiced.map((c) => c.topic)).size}`,
            label: "Topics practiced",
          },
        ].map((stat) => (
          <Panel
            key={stat.label}
            style={{ flex: 1, minWidth: 95, padding: 16, gap: 7 }}
          >
            <Copy style={{ fontFamily: serif, fontSize: 31, lineHeight: 39 }}>
              {stat.value}
            </Copy>
            <Copy style={{ fontSize: 11, color: palette.muted }}>
              {stat.label}
            </Copy>
          </Panel>
        ))}
      </View>
      <Copy style={{ color: palette.muted, fontSize: 11 }}>
        Recall = “Knew it” ratings ÷ all ratings. It reflects your own
        assessment, not a test score. Reading shorts does not affect recall
        accuracy. Concepts today counts unique cards.
      </Copy>
      <View style={s.between}>
        <Eyebrow>Where to focus next</Eyebrow>
        <Copy style={s.muted}>{weak.length} to revisit</Copy>
      </View>
      {subjects
        .filter((sub) => sub.topics.length)
        .map((sub) => {
          const count = practiced.filter((c) => c.subjectId === sub.id).length;
          const total = cards.filter((c) => c.subjectId === sub.id).length;
          return (
            <View key={sub.id} style={{ gap: 9 }}>
              <View style={s.between}>
                <Copy>{sub.name}</Copy>
                <Copy style={s.muted}>
                  {count} / {total} practiced
                </Copy>
              </View>
              <View
                style={{
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: palette.line,
                }}
              >
                <View
                  style={{
                    height: 5,
                    backgroundColor: sub.color,
                    width: `${(total ? count / total : 0) * 100}%`,
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
          );
        })}
      <Button
        onPress={() =>
          router.push(
            weak.length
              ? { pathname: "/", params: { collection: "weak" } }
              : "/",
          )
        }
      >
        {weak.length ? "Revisit weak cards →" : "Start a round →"}
      </Button>
      <Panel style={{ gap: 12 }}>
        <Eyebrow>Recent practice</Eyebrow>
        {study.allActivity.length ? (
          [...study.allActivity]
            .sort((a, b) => b.at.localeCompare(a.at))
            .slice(0, 5)
            .map((event) => (
              <View key={event.id} style={s.between}>
                <View style={{ flex: 1 }}>
                  <Copy style={{ fontSize: 13 }}>
                    {cards.find((c) => c.id === event.cardId)?.title ||
                      "Archived card"}
                  </Copy>
                  <Copy style={{ fontSize: 10, color: palette.muted }}>
                    {new Date(event.at).toLocaleDateString()}
                  </Copy>
                </View>
                <Copy style={{ fontSize: 11, color: palette.teal }}>
                  {!("rating" in event)
                    ? "Short read"
                    : event.rating === "known"
                      ? "Knew it"
                      : event.rating === "partial"
                        ? "Partially knew"
                        : "Didn't know"}
                </Copy>
              </View>
            ))
        ) : (
          <Copy style={s.muted}>
            Mark a short as read or complete a flashcard. Your practice will
            appear here.
          </Copy>
        )}
      </Panel>
    </ScrollView>
  );
}
