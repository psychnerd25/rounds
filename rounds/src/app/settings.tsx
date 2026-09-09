import { AppearancePicker } from "../components/rounds/appearance-picker";
import Constants from "expo-constants";
import { ExternalLink } from "../components/external-link";
import publisher from "../config/publisher";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useStudy } from "../state/study";
import { useContent } from "../state/content";
import { Onboarding } from "../features/onboarding";
import { Attribution } from "../components/rounds/brand";
import { Button, Copy, Eyebrow, Panel, useRoundsTheme } from "../components/rounds/ui";
export default function Settings() {
  const { s } = useRoundsTheme();
  const study = useStudy(),
    { subjects, refresh, refreshing, refreshError, lastChecked, remoteEnabled } = useContent(),
    [tour, setTour] = useState(false);
  if (tour) return <Onboarding onFinish={() => setTour(false)} />;
  return (
    <ScrollView
      contentContainerStyle={{
        padding: 26,
        gap: 22,
        maxWidth: 760,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <Eyebrow>Make room for your routine</Eyebrow>
      <Copy style={s.title}>Settings & about.</Copy>
      <AppearancePicker />
      <Button onPress={() => setTour(true)}>Replay the guided tour</Button>
      <Panel style={{ gap: 12 }}>
        <Eyebrow>Rotations you want to see more</Eyebrow>
        <Copy style={s.muted}>
          Discovery stays varied. These rotations get a small boost.
        </Copy>
        {subjects.map((sub) => (
          <Button
            key={sub.id}
            subtle
            onPress={() =>
              study.dispatch({
                kind: "preferences",
                subjectIds: study.preferences.subjectIds.includes(sub.id)
                  ? study.preferences.subjectIds.filter((id) => id !== sub.id)
                  : [...study.preferences.subjectIds, sub.id],
              })
            }
          >
            {study.preferences.subjectIds.includes(sub.id) ? "✓ " : ""}
            {sub.name}
          </Button>
        ))}
      </Panel>
      <Panel style={{ gap: 12 }}>
        <Eyebrow>Library updates</Eyebrow>
        <Copy style={s.muted}>
          {remoteEnabled
            ? "New content is checked when you open the app and while you study. New cards join your next round."
            : "You’re using the bundled library. Content updates aren’t connected yet."}
        </Copy>
        {remoteEnabled && <>
          <View accessibilityLiveRegion="polite"><Copy>
            {refreshError ?? (lastChecked ? `Last checked ${new Date(lastChecked).toLocaleString()}` : "Checking for new cards…")}
          </Copy></View>
          <Button disabled={refreshing} onPress={() => void refresh()}>
            {refreshing ? "Checking…" : "Check for new cards"}
          </Button>
        </>}
      </Panel>
      <Panel style={{ gap: 12 }}>
        <Eyebrow>Your data & offline study</Eyebrow>
        <Copy>
          Your library is stored on this device. Saved cards, study history and{" "}
          {study.preferences.misoName} work without an account or connection.
        </Copy>
        <Copy style={s.muted}>
          This build sends no study analytics or crash reports. A small local
          activity log supports progress and future diagnostics. Device or
          browser storage removal will remove your local progress.
        </Copy>
        <Copy>
          {study.error
            ? "Some changes need another save attempt."
            : study.saving
              ? "Saving…"
              : "Changes saved on this device."}
        </Copy>
        {!!study.error && (
          <Button onPress={study.retryPersistence}>Retry saving</Button>
        )}
      </Panel>
      <Panel style={{ gap: 12 }}>
        <Eyebrow>Education, with context</Eyebrow>
        <Copy>
          Rounds is a revision tool for medical students. It does not provide
          patient-specific medical advice or replace professional judgment,
          official guidelines or supervision.
        </Copy>
      </Panel>
      <View style={{ gap: 8 }}>
        <Attribution />
        <Eyebrow>Rounds · {Constants.expoConfig?.version ?? "1.0.0"}</Eyebrow>
        <Copy style={s.muted}>
          Your study progress stays on this device. No account is required.
        </Copy>
      </View>
      <Panel style={{ gap: 12 }}>
        <Eyebrow>Support & privacy</Eyebrow>
        <Copy>From {publisher.name}</Copy>
        <Copy style={s.muted}>{publisher.email}</Copy>
        <ExternalLink href={publisher.supportUrl} style={{ paddingVertical: 12 }}>
          <Copy>Get help or report a content issue ↗</Copy>
        </ExternalLink>
        <ExternalLink href={publisher.privacyUrl} style={{ paddingVertical: 12 }}>
          <Copy>Privacy policy ↗</Copy>
        </ExternalLink>
      </Panel>
    </ScrollView>
  );
}
