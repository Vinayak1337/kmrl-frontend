import "react-native-gesture-handler";
import { useEffect } from "react";
import { AppState, Platform, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  QueryClientProvider,
  focusManager,
  onlineManager,
} from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { api, queryClient } from "../src/api";
import { useApp } from "../src/store";
import { useTheme } from "../src/theme";
import { Button, Screen, Text } from "../src/ui";
import type { ErrorBoundaryProps } from "expo-router";

export const unstable_settings = { initialRouteName: "(tabs)" };

void SplashScreen.preventAutoHideAsync().catch(() => {});
export { ErrorBoundary };
function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <Screen>
      <Text size="title">Let’s try that again.</Text>
      <Text>
        The screen could not open. Your documents are still in the workspace.
      </Text>
      <Button label="Try again" onPress={retry} />
    </Screen>
  );
}
export default function Layout() {
  const ready = useApp((s) => s.ready);
  const session = useApp((s) => s.session);
  const { colors, isDark } = useTheme();
  useEffect(() => {
    void useApp.getState().hydrate();
  }, []);
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  useEffect(() => {
    const appSub = AppState.addEventListener("change", (state) => {
      if (Platform.OS !== "web") focusManager.setFocused(state === "active");
    });
    const netSub = NetInfo.addEventListener((state) =>
      onlineManager.setOnline(
        state.isConnected !== false && state.isInternetReachable !== false,
      ),
    );
    return () => {
      appSub.remove();
      netSub();
    };
  }, []);
  useEffect(() => {
    // Never allow another account to inherit queries or an in-flight mutation's UI.
    queryClient.clear();
    if (session && !session.demo) void api.session().catch(() => {});
  }, [session?.user.sub, session?.baseUrl]);
  if (!ready)
    return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={isDark ? "light" : "dark"} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.canvas },
              headerTintColor: colors.accent,
              headerTitleStyle: { color: colors.text },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.canvas },
            }}
          >
            <Stack.Protected guard={!session}>
              <Stack.Screen name="login" options={{ headerShown: false }} />
            </Stack.Protected>
            <Stack.Protected guard={!!session}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="document/[id]"
                options={{ title: "Document", headerBackTitle: "Documents" }}
              />
              <Stack.Screen name="source" options={{ title: "Source" }} />
              <Stack.Screen
                name="conversation"
                options={{ title: "Ask this document" }}
              />
              <Stack.Screen
                name="ingest"
                options={{
                  title: "Add document",
                  presentation: "modal",
                  gestureEnabled: false,
                }}
              />
              <Stack.Screen
                name="feedback"
                options={{ title: "Report an issue", presentation: "modal" }}
              />
              <Stack.Screen name="access" options={{ title: "My access" }} />
              <Stack.Protected guard={session?.user.role === "ADMIN"}>
                <Stack.Screen name="people" options={{ title: "People" }} />
                <Stack.Screen
                  name="person"
                  options={{ title: "Team member", presentation: "modal" }}
                />
                <Stack.Screen name="audit" options={{ title: "Activity" }} />
              </Stack.Protected>
            </Stack.Protected>
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
