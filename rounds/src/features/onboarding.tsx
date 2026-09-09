import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { Button, Copy, Eyebrow, Panel, useRoundsTheme } from "../components/rounds/ui";
import { MisoMark, PawMark } from "../components/rounds/miso-mark";
import { CatRoom } from "../components/rounds/cat-room";
import { rewardEconomy } from "../domain/study-service";
import { useStudy } from "../state/study";
// Deliberately isolated component state: demo never dispatches study/reward commands.
export function Onboarding({
  onFinish,
}: {
  onFinish: (skipped: boolean) => void;
}) {
  const { s } = useRoundsTheme();
  const study = useStudy();
  const [step, setStep] = useState(0),
    [revealed, setRevealed] = useState(false),
    [saved, setSaved] = useState(false),
    [rated, setRated] = useState(false);
  const touchY = useRef(0);
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 26,
        gap: 22,
        maxWidth: 620,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <View style={s.between}>
        <MisoMark
          size={44}
          breed={study.preferences.misoBreed}
          name={study.preferences.misoName}
        />
        <Button subtle onPress={() => onFinish(true)}>
          Skip tour
        </Button>
      </View>
      <Eyebrow>Try a round · {step + 1} of 3 · practice only</Eyebrow>
      {step === 0 ? (
        <>
          <Copy style={s.title}>A small round.{"\n"}A stronger memory.</Copy>
          <Copy>
            Discover short medical concepts, then recall them before reading the
            answer. A few focused cards are enough to begin.
          </Copy>
          <Copy style={s.muted}>
            Rounds is for medical education and revision, not patient-specific
            diagnosis or treatment. Use current local guidance and clinical
            supervision for patient care.
          </Copy>
          <View
            onTouchStart={(e) => {
              touchY.current = e.nativeEvent.pageY;
            }}
            onTouchEnd={(e) => {
              if (touchY.current - e.nativeEvent.pageY > 50) setStep(1);
            }}
          >
            <Panel style={{ gap: 16 }}>
              <Eyebrow>Discovery</Eyebrow>
              <Copy>
                Swipe up or use the next arrow to browse. Browsing alone earns
                no points. Recall a card, reveal the answer, then rate honestly.
              </Copy>
              <Button onPress={() => setSaved(!saved)}>
                {saved ? "◆ Saved for later" : "◇ Try saving this demo card"}
              </Button>
              {saved && (
                <Copy style={s.muted}>
                  Saved keeps useful cards close. Find them in the Saved tab.
                </Copy>
              )}
            </Panel>
          </View>
          <Button onPress={() => setStep(1)}>Next card ↓</Button>
        </>
      ) : step === 1 ? (
        <>
          <Copy style={s.title}>Try active recall.</Copy>
          <Panel style={{ gap: 18 }}>
            <Eyebrow>Demo card · study technique</Eyebrow>
            <Copy>
              Before revealing a revision card, what should you try to do?
            </Copy>
            {!revealed ? (
              <Button onPress={() => setRevealed(true)}>
                Reveal the answer ↗
              </Button>
            ) : (
              <>
                <Copy>
                  Retrieve the answer from memory. Then compare and rate
                  honestly.
                </Copy>
                <View style={{ gap: 8 }}>
                  {["Didn't know", "Partially knew", "Knew it"].map((label) => (
                    <Button key={label} subtle onPress={() => setRated(true)}>
                      {label}
                    </Button>
                  ))}
                </View>
                {rated && (
                  <View style={s.row}>
                    <PawMark />
                    <Copy>
                      +{rewardEconomy.recall} demo paws · every honest attempt
                      counts.
                    </Copy>
                  </View>
                )}
              </>
            )}
          </Panel>
          <Copy style={s.muted}>
            Recall is self-assessment, not a scored exam. It is the main way to
            study in Rounds; Read mode is there when you want a first pass.
            Smart Review brings saved, unfinished and due cards back later.
          </Copy>
          <Button disabled={!rated} onPress={() => setStep(2)}>
            See what studying grows →
          </Button>
        </>
      ) : (
        <>
          <Copy style={s.title}>A habit with a home.</Copy>
          <CatRoom
            unlocked={["quiet-corner", "cushion"]}
            breed={study.preferences.misoBreed}
            name={study.preferences.misoName}
            style={{ height: 220 }}
          />
          <Copy>
            Study earns Paw Points. At 80 paws, {study.preferences.misoName} finds a cushion. More
            studying adds a plant, books and warm light. Your room stays yours
            through every break.
          </Copy>
          <Copy>
            Progress shows study days and recall history. Topics browses
            rotations. Discovery introduces content; Smart Review in Progress
            helps you revisit it.
          </Copy>
          <Copy style={s.muted}>
            Everything in this tour was practice. Your real stats start with
            your first study card.
          </Copy>
          <Button onPress={() => onFinish(false)}>
            Start my first round →
          </Button>
        </>
      )}
    </ScrollView>
  );
}
