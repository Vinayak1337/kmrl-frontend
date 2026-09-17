import { useState } from "react";
import { Pressable, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { api } from "../../src/api";
import { useApp } from "../../src/store";
import { useTheme } from "../../src/theme";
import {
  Chips,
  DemoNotice,
  Empty,
  ErrorState,
  Icon,
  Loading,
  Text,
} from "../../src/ui";
export default function Actions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const done = useApp((s) => s.preferences.done);
  const [filter, setFilter] = useState("open");
  const [error, setError] = useState<unknown>(null);
  const query = useQuery({
    queryKey: ["actions"],
    queryFn: ({ signal }) => api.actions(signal),
  });
  const items = (query.data?.actions || []).filter(
    (a) =>
      a.type !== "information" &&
      (filter === "done" ? done.includes(a.id) : !done.includes(a.id)),
  );
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.canvas,
        paddingTop: insets.top,
      }}
    >
      <FlashList
        data={items}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        onRefresh={() => void query.refetch()}
        refreshing={query.isRefetching}
        ListHeaderComponent={
          <View style={{ gap: 16, paddingBottom: 16 }}>
            <Text size="title" accessibilityRole="header">
              Actions
            </Text>
            <Text tone="secondary">From your documents.</Text>
            <Chips
              value={filter}
              onChange={setFilter}
              options={[
                { label: "To do", value: "open" },
                { label: "Done", value: "done" },
              ]}
            />
            <Text size="small" tone="secondary">
              Completion marks are private to this device.
            </Text>
            <DemoNotice />
            {(error || query.error) && (
              <ErrorState
                error={error || query.error}
                retry={() => void query.refetch()}
              />
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              paddingVertical: 20,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel={`Mark ${item.action} ${done.includes(item.id) ? "to do" : "done"}`}
              accessibilityState={{ checked: done.includes(item.id) }}
              aria-checked={done.includes(item.id)}
              style={{
                minWidth: 48,
                minHeight: 48,
                paddingTop: 4,
                alignItems: "center",
              }}
              onPress={() =>
                void useApp.getState().toggle("done", item.id).catch(setError)
              }
            >
              <Icon
                name={
                  done.includes(item.id)
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                color={colors.accent}
                size={26}
              />
            </Pressable>
            <View style={{ flex: 1, gap: 10 }}>
              <Text
                style={{
                  textDecorationLine: done.includes(item.id)
                    ? "line-through"
                    : "none",
                }}
              >
                {item.action}
              </Text>
              {item.dueDate && (
                <Text
                  size="small"
                  tone={item.isUrgent ? "warning" : "secondary"}
                >
                  {item.dueDate}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Read source for ${item.action}`}
                style={{ minHeight: 48, justifyContent: "center" }}
                onPress={() =>
                  item.sectionId
                    ? router.push({
                        pathname: "/source",
                        params: { uid: `${item.documentId}#${item.sectionId}` },
                      })
                    : router.push({
                        pathname: "/document/[id]",
                        params: { id: item.documentId },
                      })
                }
              >
                <Text size="small" tone="accent">
                  {item.documentTitle} ↗
                </Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          query.isPending ? (
            <Loading />
          ) : query.error ? null : (
            <Empty
              icon="checkmark-done-outline"
              title={
                filter === "done" ? "Nothing marked done yet" : "All clear"
              }
              message={
                filter === "done"
                  ? "Completed actions will appear here."
                  : "There are no open actions in the loaded records."
              }
            />
          )
        }
      />
    </View>
  );
}
