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
  daysLabel,
  tierLabel,
  type Action,
  type DeadlineAlert,
  type DeadlineTier,
} from "../../src/domain";
import {
  Chips,
  DemoNotice,
  Empty,
  ErrorState,
  Icon,
  Loading,
  Text,
} from "../../src/ui";

const TIERS: DeadlineTier[] = [
  "overdue",
  "within5",
  "within15",
  "within30",
  "later",
];
const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function useTierColor() {
  const { colors } = useTheme();
  return (tier: DeadlineTier) =>
    tier === "overdue" || tier === "within5"
      ? colors.danger
      : tier === "within15"
        ? colors.warning
        : tier === "within30"
          ? colors.info
          : colors.success;
}

export default function Actions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const tierColor = useTierColor();
  const done = useApp((s) => s.preferences.done);
  const [filter, setFilter] = useState("deadlines");
  const [error, setError] = useState<unknown>(null);
  const deadlines = filter === "deadlines";
  const actionsQuery = useQuery({
    queryKey: ["actions"],
    queryFn: ({ signal }) => api.actions(signal),
    enabled: !deadlines,
  });
  const alertsQuery = useQuery({
    queryKey: ["alerts"],
    queryFn: ({ signal }) => api.alerts(signal),
  });
  const query = deadlines ? alertsQuery : actionsQuery;
  const alerts = alertsQuery.data?.alerts || [];
  const items = (actionsQuery.data?.actions || []).filter(
    (a) =>
      a.type !== "information" &&
      (filter === "done" ? done.includes(a.id) : !done.includes(a.id)),
  );
  const counts = TIERS.map(
    (tier) => [tier, alerts.filter((a) => a.tier === tier).length] as const,
  ).filter(([, n]) => n);

  const renderDeadline = (item: DeadlineAlert) => {
    const color = tierColor(item.tier);
    const informed = new Set(item.notifications.flatMap((n) => n.recipients))
      .size;
    return (
      <View
        style={{
          flexDirection: "row",
          gap: 14,
          paddingVertical: 18,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View
          style={{ width: 4, borderRadius: 2, backgroundColor: color }}
          accessibilityElementsHidden
        />
        <View style={{ flex: 1, gap: 8 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Text size="small" style={{ fontWeight: "700" }}>
              {formatDate(item.date)}
            </Text>
            <Text size="small" style={{ color, fontWeight: "700" }}>
              {daysLabel(item.daysLeft)}
            </Text>
          </View>
          <Text>{item.requirement}</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Read source in ${item.documentTitle}`}
            style={{ minHeight: 40, justifyContent: "center" }}
            onPress={() =>
              router.push({
                pathname: "/source",
                params: { uid: `${item.documentId}#${item.sectionId}` },
              })
            }
          >
            <Text size="small" tone="accent">
              {item.documentTitle}
              {item.pageStart ? ` · p. ${item.pageStart}` : ""} ↗
            </Text>
          </Pressable>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Inform authorities about ${item.requirement}`}
              onPress={() =>
                router.push({ pathname: "/notify", params: { id: item.id } })
              }
              style={({ pressed }) => ({
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Icon name="notifications-outline" color={colors.accent} />
              <Text tone="accent" style={{ fontWeight: "600" }}>
                Inform authorities
              </Text>
            </Pressable>
            {informed > 0 && (
              <Text size="small" style={{ color: colors.success }}>
                ✓ {informed} informed
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderAction = (item: Action) => (
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
          name={done.includes(item.id) ? "checkmark-circle" : "ellipse-outline"}
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
          <Text size="small" tone={item.isUrgent ? "warning" : "secondary"}>
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
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.canvas,
        paddingTop: insets.top,
      }}
    >
      <FlashList<DeadlineAlert | Action>
        data={deadlines ? alerts : items}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        onRefresh={() => void query.refetch()}
        refreshing={query.isRefetching}
        ListHeaderComponent={
          <View style={{ gap: 16, paddingBottom: 8 }}>
            <Text size="title" accessibilityRole="header">
              Actions
            </Text>
            <Text tone="secondary">
              Deadlines and follow-ups from your documents.
            </Text>
            <Chips
              value={filter}
              onChange={setFilter}
              options={[
                {
                  label: alerts.length
                    ? `Deadlines · ${alerts.length}`
                    : "Deadlines",
                  value: "deadlines",
                },
                { label: "To do", value: "open" },
                { label: "Done", value: "done" },
              ]}
            />
            {deadlines ? (
              counts.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
                  {counts.map(([tier, n]) => (
                    <View
                      key={tier}
                      style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                    >
                      <View
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 5,
                          backgroundColor: tierColor(tier),
                        }}
                      />
                      <Text size="small" tone="secondary">
                        {tierLabel[tier]} · {n}
                      </Text>
                    </View>
                  ))}
                </View>
              )
            ) : (
              <Text size="small" tone="secondary">
                Completion marks are private to this device.
              </Text>
            )}
            <DemoNotice />
            {(error || query.error) && (
              <ErrorState
                error={error || query.error}
                retry={() => void query.refetch()}
              />
            )}
          </View>
        }
        renderItem={({ item }) =>
          deadlines
            ? renderDeadline(item as DeadlineAlert)
            : renderAction(item as Action)
        }
        ListEmptyComponent={
          query.isPending ? (
            <Loading />
          ) : query.error ? null : deadlines ? (
            <Empty
              icon="calendar-outline"
              title="No upcoming deadlines"
              message="Dated requirements found in your documents will appear here, nearest first."
            />
          ) : (
            <Empty
              icon="checkmark-done-outline"
              title={filter === "done" ? "Nothing marked done yet" : "All clear"}
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
