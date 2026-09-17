import { View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../src/api";
import { useApp } from "../src/store";
import { useTheme } from "../src/theme";
import { humanize } from "../src/domain";
import {
  Button,
  Empty,
  ErrorState,
  Loading,
  Notice,
  Row,
  Text,
} from "../src/ui";
export default function Audit() {
  const demo = useApp((s) => s.session?.demo);
  const { colors } = useTheme();
  const query = useInfiniteQuery({
    queryKey: ["audit"],
    queryFn: ({ pageParam, signal }) => api.audit(pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      pages.length * 25 < last.total ? pages.length : undefined,
    enabled: !demo,
  });
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <FlashList
        contentContainerStyle={{ padding: 24 }}
        data={query.data?.pages.flatMap((p) => p.logs) || []}
        keyExtractor={(a) => a.id}
        onRefresh={() => {
          if (!demo) void query.refetch();
        }}
        refreshing={query.isRefetching}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <Text size="title">Activity</Text>
            {demo ? (
              <Notice message="Recorded activity is available in a live administrator account." />
            ) : (
              <Text tone="secondary">Recorded workspace changes.</Text>
            )}
            {query.error && (
              <ErrorState
                error={query.error}
                retry={() => void query.refetch()}
              />
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Row
            icon="time-outline"
            title={humanize(item.action)}
            subtitle={`${item.actorName || "Administrator"} · ${new Date(item.createdAt).toLocaleString()}${item.details?.title ? `\n${item.details.title}` : ""}`}
          />
        )}
        ListEmptyComponent={
          !demo && query.isPending ? (
            <Loading />
          ) : !demo && !query.error ? (
            <Empty
              title="No recorded activity"
              message="Workspace changes will appear here."
            />
          ) : null
        }
        ListFooterComponent={
          query.hasNextPage ? (
            <Button
              kind="quiet"
              label="Load more"
              busy={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            />
          ) : null
        }
      />
    </View>
  );
}
