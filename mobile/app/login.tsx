import { useState } from "react";
import { View, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { api } from "../src/api";
import { useApp } from "../src/store";
import {
  Brand,
  Button,
  ErrorState,
  Field,
  Notice,
  Screen,
  Text,
} from "../src/ui";
export default function Login() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const baseUrl = useApp((s) => s.baseUrl);
  const notice = useApp((s) => s.authNotice);
  const [address, setAddress] = useState(baseUrl);
  const [settings, setSettings] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const login = useMutation({
    mutationFn: async () => {
      if (!email.trim() || !password)
        throw new Error("Enter your email and password.");
      await useApp.getState().setBaseUrl(address);
      const session = await api.login(email.trim(), password);
      await useApp
        .getState()
        .signIn({ ...session, baseUrl: useApp.getState().baseUrl });
    },
    onSuccess: () => {
      setPassword("");
      router.replace("/");
    },
  });
  return (
    <Screen style={{ paddingTop: insets.top + 40, gap: 28 }}>
      <Brand size={48} wordmark />
      <View style={{ gap: 12, marginTop: 28 }}>
        <Text size="title">Your documents.{"\n"}Within reach.</Text>
        <Text tone="secondary">Sign in to your workspace.</Text>
      </View>
      {notice ? <Notice message={notice} /> : null}
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@organization.in"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={() => {
          if (!login.isPending) login.mutate();
        }}
        returnKeyType="go"
      />
      {(error || login.error) && <ErrorState error={error || login.error} />}
      <Button
        label="Sign in"
        busy={login.isPending}
        onPress={() => login.mutate()}
        icon="arrow-forward"
      />
      <Button
        kind="quiet"
        label="Explore sample workspace"
        onPress={() => {
          void useApp
            .getState()
            .enterDemo()
            .then(() => router.replace("/"))
            .catch(setError);
        }}
      />
      <View style={{ gap: 16 }}>
        <Button
          kind="quiet"
          label="Workspace address"
          icon="globe-outline"
          onPress={() => setSettings(!settings)}
        />
        {settings && (
          <Field
            label="Workspace URL"
            value={address}
            onChangeText={setAddress}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://your-workspace.com"
          />
        )}
        <Text tone="secondary" size="small" style={{ textAlign: "center" }}>
          Need an account or a password reset? Contact your workspace
          administrator.
        </Text>
        {Platform.OS === "web" && (
          <Button
            kind="quiet"
            label="Open website"
            onPress={() => void Linking.openURL(baseUrl).catch(setError)}
          />
        )}
      </View>
    </Screen>
  );
}
