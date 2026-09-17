import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
import { useTheme } from "../../src/theme";
import { Icon, type IconName } from "../../src/ui";
export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 68 + Math.max(insets.bottom, 8),
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
        tabBarHideOnKeyboard: true,
      }}
    >
      {(
        [
          { name: "index", title: "Documents", icon: "documents-outline" },
          { name: "ask", title: "Ask", icon: "chatbubble-outline" },
          { name: "actions", title: "Actions", icon: "checkbox-outline" },
          { name: "workspace", title: "Workspace", icon: "people-outline" },
        ] as const
      ).map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => (
              <Icon name={tab.icon as IconName} color={color} size={23} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
