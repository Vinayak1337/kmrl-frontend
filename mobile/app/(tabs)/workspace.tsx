import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/store";
import { queryClient } from "../../src/api";
import {
  Brand,
  Button,
  confirm,
  DemoNotice,
  ErrorState,
  Picker,
  Row,
  Screen,
  Text,
} from "../../src/ui";
export default function Workspace() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useApp((s) => s.session);
  const theme = useApp((s) => s.theme);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function logout() {
    if (
      busy ||
      !(await confirm(
        "Sign out?",
        "Your documents remain in your workspace.",
        "Sign out",
      ))
    )
      return;
    setBusy(true);
    try {
      queryClient.clear();
      await useApp.getState().signOut();
      router.replace("/login");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen style={{ paddingTop: insets.top + 24 }}>
      <Brand wordmark />
      <Text size="title" accessibilityRole="header">
        Workspace
      </Text>
      <View style={{ gap: 6 }}>
        <Text size="heading">{session?.user.name}</Text>
        <Text tone="secondary" selectable>
          {session?.user.email}
        </Text>
        <Text size="small" tone="secondary">
          {session?.user.role === "ADMIN" ? "Administrator" : "Manager"}
        </Text>
      </View>
      <DemoNotice />
      <Picker
        label="Appearance"
        value={theme}
        options={[
          { label: "Use device setting", value: "system" },
          { label: "Light", value: "light" },
          { label: "Dark", value: "dark" },
        ]}
        onChange={(value) =>
          void useApp
            .getState()
            .setTheme(value as typeof theme)
            .catch(setError)
        }
      />
      <View>
        <Row
          icon="shield-checkmark-outline"
          title="My access"
          subtitle="Teams and document permissions"
          onPress={() => router.push("/access")}
        />
        {session?.user.role === "ADMIN" && (
          <>
            <Row
              icon="people-outline"
              title="People"
              subtitle="Manage your team"
              onPress={() => router.push("/people")}
            />
            <Row
              icon="time-outline"
              title="Activity"
              subtitle="Recorded workspace changes"
              onPress={() => router.push("/audit")}
            />
          </>
        )}
      </View>
      <Text size="small" tone="secondary">
        Saved documents and action checkmarks stay on this device. Document
        contents require a connection.
      </Text>
      {!!error && <ErrorState error={error} />}
      <Button
        kind="secondary"
        label={session?.demo ? "Leave sample workspace" : "Sign out"}
        icon="log-out-outline"
        busy={busy}
        onPress={() => void logout()}
      />
      <Text size="small" tone="secondary">
        DocSetu · 1.0.0
      </Text>
    </Screen>
  );
}
