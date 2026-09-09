import { useEffect, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { useStudy } from "../state/study";
import { nextPawMilestone, pawMilestones } from "../state/paw-points";
import { CatRoom } from "../components/rounds/cat-room";
import { Copy, Eyebrow, Button, Panel, serif, useRoundsTheme } from "../components/rounds/ui";
import { rewardEconomy } from "../domain/study-service";
import { MisoMark, PawMark } from "../components/rounds/miso-mark";
import { dayKey } from "../state/progress";
import { catBreeds, type CatBreed } from "../domain/interactions";

const breedDetails: Record<CatBreed, { name: string; detail: string }> = {
  ginger: { name: "Ginger tabby", detail: "Warm, striped, and classic." },
  tuxedo: { name: "Tuxedo", detail: "Black with a neat white bib." },
  siamese: { name: "Siamese", detail: "Cream with deep seal points." },
};

export default function Cat() {
  const { palette, s } = useRoundsTheme();
  const study = useStudy();
  const { paws } = study;
  const [nameDraft, setNameDraft] = useState(study.preferences.misoName);
  const [newItem] = useState(() => paws.unseenUnlocked[0] ?? null);
  const next = nextPawMilestone(paws);
  useEffect(() => {
    study.seePawUnlocks();
  }, []);
  useEffect(() => {
    setNameDraft(study.preferences.misoName);
  }, [study.preferences.misoName]);
  const progress = next
    ? Math.min(
        1,
        (paws.total - pawMilestones[paws.progressionLevel].at) /
          (next.at - pawMilestones[paws.progressionLevel].at),
      )
    : 1;
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 26,
        maxWidth: 760,
        width: "100%",
        alignSelf: "center",
        gap: 18,
      }}
    >
      <Eyebrow>A quiet reward for real study</Eyebrow>
      <View style={s.row}>
        <MisoMark
          size={40}
          breed={study.preferences.misoBreed}
          name={study.preferences.misoName}
        />
        <Copy>
          Level {paws.progressionLevel + 1} ·{" "}
          {pawMilestones[paws.progressionLevel].name}
        </Copy>
      </View>
      <View style={s.between}>
        <Copy style={s.title}>{study.preferences.misoName}’s room.</Copy>
        <View
          style={{
            backgroundColor: palette.mint,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Copy
            style={{ fontSize: 13, fontWeight: "700", color: palette.teal }}
          >
            {paws.total} paws
          </Copy>
        </View>
      </View>
      <Copy style={s.muted}>
        Your rounds slowly make this little corner more lived in. Nothing fades
        if you take a break.
      </Copy>
      <CatRoom
        unlocked={paws.unlocked}
        breed={study.preferences.misoBreed}
        name={study.preferences.misoName}
      />
      <View style={s.row}>
        <PawMark />
        <Copy>
          You earned{" "}
          {paws.ledger
            .filter(
              (entry) => entry.at && dayKey(new Date(entry.at)) === study.today,
            )
            .reduce((sum, entry) => sum + entry.amount, 0)}{" "}
          paws from study today.
        </Copy>
      </View>
      {newItem && (
        <Panel
          style={{
            padding: 16,
            backgroundColor: palette.warm,
            borderColor: "#E3B69E",
            gap: 4,
          }}
        >
          <Eyebrow>New in the room</Eyebrow>
          <Copy style={{ fontFamily: serif, fontSize: 21 }}>
            {pawMilestones.find((item) => item.id === newItem)?.name}
          </Copy>
          <Copy style={s.muted}>
            {pawMilestones.find((item) => item.id === newItem)?.detail}
          </Copy>
        </Panel>
      )}
      <Panel style={{ padding: 18, gap: 10 }}>
        <Eyebrow>{study.preferences.misoName}’s next upgrade</Eyebrow>
        <Copy>
          {next
            ? `${paws.total} / ${next.at} Paw Points`
            : `${paws.lifetime} lifetime Paw Points`}
        </Copy>
        <View style={s.between}>
          <Copy style={{ fontFamily: serif, fontSize: 21 }}>
            {next ? next.name : "The room is complete"}
          </Copy>
          <Copy
            style={{ color: palette.teal, fontWeight: "700", fontSize: 12 }}
          >
            {next ? `${Math.max(0, next.at - paws.total)} to go` : ""}
          </Copy>
        </View>
        <View
          style={{ height: 7, borderRadius: 4, backgroundColor: palette.line }}
        >
          <View
            style={{
              width: `${progress * 100}%`,
              height: 7,
              borderRadius: 4,
              backgroundColor: palette.teal,
            }}
          />
        </View>
        <Copy style={s.muted}>
          {next ? next.detail : "Keep studying for the joy of the round."}
        </Copy>
      </Panel>
      <Panel style={{ gap: 12, padding: 18 }}>
        <Eyebrow>How your study grows this room</Eyebrow>
        <Copy>
          Read and complete a card: +{rewardEconomy.read} paws. Reveal and rate
          recall: +{rewardEconomy.recall}, whatever your rating.
        </Copy>
        <Copy style={s.muted}>
          Each card earns once per mode per day. Complete{" "}
          {rewardEconomy.dailyGoal} different cards for +
          {rewardEconomy.dailyBonus}. Every {rewardEconomy.streakEvery}th study
          day in a streak adds +{rewardEconomy.streakBonus}. Points unlock room
          changes automatically.
        </Copy>
        <Eyebrow>Recent rewards</Eyebrow>
        {paws.ledger.length ? (
          paws.ledger
            .slice(-5)
            .reverse()
            .map((entry) => (
              <View key={entry.id} style={s.between}>
                <Copy style={s.muted}>{entry.action.replaceAll("_", " ")}</Copy>
                <Copy>+{entry.amount}</Copy>
              </View>
            ))
        ) : (
          <Copy style={s.muted}>
            Your first completed card starts {study.preferences.misoName}’s room. Previously earned paws
            stay with you even when detailed history is unavailable.
          </Copy>
        )}
      </Panel>
      <View style={{ gap: 10, marginTop: 3 }}>
        <Eyebrow>Room notes</Eyebrow>
        {pawMilestones.slice(1).map((milestone) => {
          const open = paws.unlocked.includes(milestone.id);
          return (
            <View
              key={milestone.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderColor: palette.line,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: open ? palette.mint : palette.soft,
                }}
              >
                <Copy style={{ fontSize: 15 }}>{open ? "✓" : "·"}</Copy>
              </View>
              <View style={{ flex: 1 }}>
                <Copy
                  style={{
                    fontWeight: open ? "700" : "400",
                    color: open ? palette.ink : palette.muted,
                  }}
                >
                  {milestone.name}
                </Copy>
                <Copy style={{ color: palette.muted, fontSize: 11 }}>
                  {open ? milestone.detail : `${milestone.at} Paw Points`}
                </Copy>
              </View>
            </View>
          );
        })}
      </View>
      <Panel style={{ padding: 18, gap: 10 }}>
        <Eyebrow>Choose {study.preferences.misoName}’s look</Eyebrow>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {catBreeds.map((breed) => {
            const selected = study.preferences.misoBreed === breed;
            return (
              <Button
                key={breed}
                subtle={!selected}
                onPress={() => study.dispatch({ kind: "miso_breed", breed })}
                style={{ minHeight: 40, paddingHorizontal: 13 }}
              >
                {breedDetails[breed].name}
              </Button>
            );
          })}
        </View>
        <Copy style={s.muted}>
          {breedDetails[study.preferences.misoBreed].detail}
        </Copy>
      </Panel>
      <Panel style={{ padding: 18, gap: 10 }}>
        <Eyebrow>Name your cat</Eyebrow>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TextInput
            accessibilityLabel="Your cat's name"
            maxLength={30}
            onChangeText={setNameDraft}
            onSubmitEditing={() =>
              nameDraft.trim() &&
              study.dispatch({ kind: "miso_name", name: nameDraft })
            }
            placeholder="Your cat"
            value={nameDraft}
            style={{
              flex: 1,
              minHeight: 42,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: palette.line,
              borderRadius: 10,
              color: palette.ink,
              backgroundColor: palette.white,
            }}
          />
          <Button
            disabled={
              !nameDraft.trim() ||
              nameDraft.trim() === study.preferences.misoName
            }
            onPress={() =>
              study.dispatch({ kind: "miso_name", name: nameDraft })
            }
            style={{ minHeight: 42, paddingHorizontal: 14 }}
          >
            Save
          </Button>
        </View>
      </Panel>
    </ScrollView>
  );
}
