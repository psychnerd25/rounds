import {
  FlatList,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useContent } from "../state/content";
import { useStudyFeed, type FeedParams } from "../hooks/use-study-feed";
import { useReducedMotion } from "../hooks/use-reduced-motion";
import { Button, Copy, Eyebrow, serif, useRoundsTheme } from "../components/rounds/ui";
import { ShortCard } from "../components/rounds/short-card";
import { StreakChip } from "../components/rounds/streak-celebration";
export default function Feed() {
  const { palette, s } = useRoundsTheme();
  const params = useLocalSearchParams<FeedParams>();
  const reduced = useReducedMotion();
  const wide = useWindowDimensions().width >= 900;
  const compactScreen = useWindowDimensions().height < 700 || useWindowDimensions().fontScale > 1.15;
  const Root = compactScreen ? ScrollView : View;
  const { subjects } = useContent();
  const {
    study,
    mode,
    rotation,
    subject,
    deck,
    card,
    index,
    height,
    setHeight,
    list,
    currentIndex,
    scrollTimer,
    revealed,
    ratings,
    pawFeedback,
    session,
    settle,
    move,
    onScroll,
    canComplete,
    completed,
    completeRead,
    rate,
    reveal,
    open,
    reset,
    setMode,
    setSubject,
    switchPath,
  } = useStudyFeed(params, reduced);
  return (
    <Root
      {...(compactScreen ? { contentContainerStyle: {paddingBottom:12} } : {})}
      style={{
        flex: 1,
        width: "100%",
        maxWidth: 720,
        alignSelf: "center",
        paddingHorizontal: wide ? 36 : 18,
        paddingTop: wide ? 26 : 3,
      }}
    >
      {wide && (
        <View style={[s.between, { marginBottom: 16 }]}>
          <Eyebrow>Small pockets. Real reps.</Eyebrow>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View your streak"
            onPress={() => router.push("/progress")}
          >
            <StreakChip />
          </Pressable>
        </View>
      )}
      <View style={[s.between, { marginBottom: 12, flexWrap:"wrap" }]}>
        <View>
          <Copy
            style={{
              fontFamily: serif,
              fontSize: wide ? 30 : 25,
              lineHeight: 34,
            }}
          >
            Your daily dose.
          </Copy>
          {wide && (
            <Copy style={s.muted}>
              A little medicine. Wherever the day takes you.
            </Copy>
          )}
        </View>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: palette.soft,
            borderRadius: 12,
            padding: 3,
          }}
        >
          {(["recall", "read"] as const).map((value) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                value === "read" ? "Read mode" : "Recall mode"
              }
              accessibilityState={{ selected: value === mode }}
              key={value}
              onPress={() => setMode(value)}
              style={{
                paddingHorizontal: 13,
                paddingVertical: 10,
                borderRadius: 9,
                backgroundColor: mode === value ? palette.white : "transparent",
              }}
            >
              <Copy
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: mode === value ? palette.teal : palette.muted,
                }}
              >
                {value === "read" ? "Read" : "Recall"}
              </Copy>
            </Pressable>
          ))}
        </View>
      </View>
      {params.collection || params.topic ? (
        <View style={[s.between, { marginBottom: 8 }]}>
          <Copy style={{ color: palette.teal, fontSize: 12, flex: 1 }}>
            {params.topic ||
              (params.collection === "saved"
                ? "Your saved collection"
                : params.collection === "weak"
                  ? "Weak cards · practice again"
                : "Smart Review · a second look")}
          </Copy>
          <Button subtle onPress={() => router.replace("/")}>
            All shorts ×
          </Button>
        </View>
      ) : (
        <View
          style={{
            flexDirection: "row",
            gap: 20,
            borderBottomWidth: 1,
            borderColor: palette.line,
            marginBottom: 8,
          }}
        >
          {[
            { name: "Discovery", value: false },
            { name: "Rotations", value: true },
          ].map((item) => (
            <Pressable
              key={item.name}
              accessibilityRole="button"
              accessibilityState={{ selected: rotation === item.value }}
              onPress={() => switchPath(item.value)}
              style={{
                paddingVertical: 10,
                borderBottomWidth: 2,
                borderColor:
                  rotation === item.value ? palette.teal : "transparent",
              }}
            >
              <Copy
                style={{
                  color: rotation === item.value ? palette.teal : palette.muted,
                  fontSize: 13,
                  fontWeight: rotation === item.value ? "700" : "400",
                }}
              >
                {item.name === "Discovery" ? "⇄  " : "⊞  "}
                {item.name}
              </Copy>
            </Pressable>
          ))}
        </View>
      )}
      {rotation && !params.topic && (
        <View style={{ height: 46 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 7, alignItems: "flex-start" }}
          >
            {[
              { id: "all", name: "All rotations" },
              ...subjects.filter((s) => s.topics.length),
            ].map((sub) => (
              <Pressable
                key={sub.id}
                accessibilityRole="button"
                accessibilityState={{ selected: subject === sub.id }}
                onPress={() => {
                  setSubject(sub.id);
                }}
                style={{
                  backgroundColor:
                    subject === sub.id ? palette.teal : palette.white,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: palette.line,
                }}
              >
                <Copy
                  style={{
                    fontSize: 11,
                    color: subject === sub.id ? palette.white : palette.muted,
                  }}
                >
                  {sub.name}
                </Copy>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      <View style={[s.between, { marginTop: 2, marginBottom: 7 }]}>
        <Copy style={{ fontSize: 9, letterSpacing: 1.4, color: palette.muted }}>
          {mode === "read" ? "THE SHORTS" : "ACTIVE RECALL"} ·{" "}
          {rotation ? "ROTATION ORDER" : "MIXED ROUND"}
        </Copy>
        <Copy style={{ fontSize: 10, color: palette.muted }}>
          {Math.min(index + 1, deck.length)} / {deck.length}
        </Copy>
      </View>
      <View style={{ flexDirection: "row", gap: 5, marginBottom: 10 }}>
        {deck.map((c, i) => (
          <View
            key={c.id}
            style={{
              height: 3,
              flex: 1,
              borderRadius: 2,
              backgroundColor: session?.completedCardIds.includes(c.id)
                ? palette.teal
                : i === index
                  ? "#99B3A0"
                  : palette.line,
            }}
          />
        ))}
      </View>
      <View
        style={compactScreen ? {height:420} : { flex: 1 }}
        onLayout={(e) => {
          const next = Math.round(e.nativeEvent.layout.height);
          if (next !== height) {
            setHeight(next);
            requestAnimationFrame(() =>
              list.current?.scrollToOffset({
                offset: currentIndex.current * next,
                animated: false,
              }),
            );
          }
        }}
      >
        {height > 0 && (
          <FlatList
            ref={list}
            data={[...deck, null]}
            keyExtractor={(item) => item?.id || "complete"}
            extraData={{ mode, revealed }}
            pagingEnabled
            snapToInterval={height}
            decelerationRate="fast"
            disableIntervalMomentum
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              if (scrollTimer.current) clearTimeout(scrollTimer.current);
              settle(Math.round(e.nativeEvent.contentOffset.y / height));
            }}
            getItemLayout={(_, i) => ({
              length: height,
              offset: height * i,
              index: i,
            })}
            renderItem={({ item, index: pageIndex }) => (
              <View
                aria-hidden={pageIndex !== index}
                accessibilityElementsHidden={pageIndex !== index}
                importantForAccessibility={
                  pageIndex === index ? "auto" : "no-hide-descendants"
                }
                style={{ height, paddingBottom: 6 }}
              >
                {item ? (
                  <ShortCard
                    card={item}
                    recall={mode === "recall"}
                    revealed={!!revealed[item.id]}
                    onReveal={reveal}
                    onOpen={open}
                  />
                ) : (
                  <ScrollView
                    contentContainerStyle={{ padding: 20, gap: 14 }}
                    style={{
                      flex: 1,
                      borderRadius: 24,
                      backgroundColor: palette.white,
                      borderWidth: 1,
                      borderColor: palette.line,
                    }}
                  >
                    <Eyebrow>
                      {deck.length
                        ? "A pocket of time, well spent"
                        : "Nothing here yet"}
                    </Eyebrow>
                    <Copy
                      style={{
                        fontFamily: serif,
                        fontSize: 32,
                        lineHeight: 39,
                      }}
                    >
                      {deck.length
                        ? "That’s your round."
                        : "Your collection starts with one card."}
                    </Copy>
                    <Copy style={s.muted}>
                      {deck.length
                        ? "Let it settle, or take another little dose."
                        : "Save a short or practice recall to build a personal collection."}
                    </Copy>
                    <Copy>
                      {session?.completedCardIds.length ?? 0} / {deck.length}{" "}
                      cards completed · +{session?.earnedPaws ?? 0} Paw Points
                    </Copy>
                    <Copy style={s.muted}>
                      {session?.completedAt
                        ? "Round complete. Your progress is saved locally."
                        : "Skipped cards stay uncompleted. Return with the previous arrow."}
                    </Copy>
                    <Button subtle onPress={() => router.push("/cat")}>
                      {study.paws.unseenUnlocked.length
                        ? `Something new in ${study.preferences.misoName}’s room ↗`
                        : `Visit ${study.preferences.misoName} ↗`}
                    </Button>
                    <Button
                      onPress={() => {
                        if (!deck.length) router.replace("/");
                        else {
                          reset();
                        }
                      }}
                    >
                      {deck.length ? "Another round ↗" : "Explore the shorts"}
                    </Button>
                    <Button subtle onPress={() => router.push("/progress")}>
                      See your progress
                    </Button>
                  </ScrollView>
                )}
              </View>
            )}
          />
        )}
      </View>
      <View style={{ paddingTop: 8, paddingBottom: 10, gap: 5 }}>
        {mode === "read" && card && (
          <Button
            subtle
            disabled={!canComplete || completed}
            onPress={completeRead}
          >
            {completed
              ? "✓ Read recorded"
              : canComplete
                ? "Mark as read · up to 4 paws"
                : "Take a moment to read"}
          </Button>
        )}
        <View
          style={{ minHeight: 44, justifyContent: "center" }}
          accessibilityLiveRegion="polite"
        >
          {pawFeedback ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View Paw Points"
              onPress={() => router.push("/cat")}
              style={{
                alignSelf: "center",
                backgroundColor: palette.warm,
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Copy
                style={{
                  color: palette.teal,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                +{pawFeedback.amount} Paw Points
                {pawFeedback.unlocked ? " · something changed" : ""}
              </Copy>
            </Pressable>
          ) : (
            <Copy
              style={{
                fontSize: 11,
                textAlign: "center",
                color: palette.muted,
              }}
            >
              Study builds your streak and {study.preferences.misoName}’s room.
            </Copy>
          )}
        </View>
        {mode === "recall" && card && revealed[card.id] && !ratings[card.id] ? (
          <>
            <Copy
              style={{
                textAlign: "center",
                color: palette.muted,
                fontSize: 10,
              }}
            >
              How well did you know it?
            </Copy>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {(
                [
                  { value: "again", text: "Didn't know", bg: palette.rose },
                  { value: "partial", text: "Partially knew", bg: palette.warm },
                  { value: "known", text: "Knew it", bg: palette.mint },
                ] as const
              ).map((item) => (
                <Button
                  key={item.value}
                  subtle
                  onPress={() => rate(item.value)}
                  disabled={!canComplete}
                  style={{
                    flex: 1,
                    paddingHorizontal: 2,
                    backgroundColor: item.bg,
                  }}
                >
                  {item.text}
                </Button>
              ))}
            </View>
          </>
        ) : (
          <View style={s.between}>
            <Button
              subtle
              label="Previous card"
              disabled={index === 0}
              onPress={() => move(-1)}
              style={{ paddingHorizontal: 16, backgroundColor: "transparent" }}
            >
              ↑
            </Button>
            <Copy
              style={{
                flex: 1,
                fontSize: 11,
                textAlign: "center",
                color: palette.muted,
              }}
            >
              {card && ratings[card.id] && mode === "recall"
                ? "✓ Recall recorded · swipe for the next"
                : card
                  ? compactScreen
                    ? "Scroll to read · arrows for the next short"
                    : "Swipe up for your next little dose"
                  : "Small pockets. Real progress."}
            </Copy>
            <Button
              subtle
              label={index === deck.length - 1 ? "Finish round" : "Next card"}
              disabled={!card}
              onPress={() => move(1)}
              style={{ paddingHorizontal: 16, backgroundColor: "transparent" }}
            >
              ↓
            </Button>
          </View>
        )}
      </View>
    </Root>
  );
}
