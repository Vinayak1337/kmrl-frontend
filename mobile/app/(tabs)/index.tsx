import { DocumentCover } from "../../src/DocumentCover";
import { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useQueries } from "@tanstack/react-query";
import { api, queryClient } from "../../src/api";
import { useApp } from "../../src/store";
import {
  departmentOf,
  humanize,
  typeOf,
  type Document,
} from "../../src/domain";
import { useTheme } from "../../src/theme";
import {
  Brand,
  Button,
  Chips,
  DemoNotice,
  Empty,
  ErrorState,
  Icon,
  IconButton,
  Loading,
  Text,
} from "../../src/ui";

export default function Documents() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const saved = useApp((s) => s.preferences.saved);
  const session = useApp((s) => s.session);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [mode, setMode] = useState("recent");
  const [localError, setLocalError] = useState<unknown>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 250);
    return () => clearTimeout(timer);
  }, [text]);
  const query = useInfiniteQuery({
    queryKey: ["documents", search, type],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      api.documents(pageParam, search, type, signal),
    getNextPageParam: (page) =>
      (page.page + 1) * page.pageSize < page.totalCount
        ? page.page + 1
        : undefined,
    enabled: mode === "recent",
  });
  const savedQueries = useQueries({
    queries: saved.map((id) => ({
      queryKey: ["document", id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        api.document(id, signal),
      enabled: mode === "saved",
    })),
  });
  const savedDocs = savedQueries
    .flatMap((q) => (q.data ? [q.data] : []))
    .filter(
      (d) =>
        (!search || d.title.toLowerCase().includes(search.toLowerCase())) &&
        (!type || typeOf(d)?.toLowerCase() === type),
    );
  const docs =
    mode === "saved"
      ? savedDocs
      : query.data?.pages.flatMap((p) => p.documents) || [];
  const error =
    mode === "saved" ? savedQueries.find((q) => q.error)?.error : query.error;
  const pending =
    mode === "saved" ? savedQueries.some((q) => q.isLoading) : query.isPending;
  function open(doc: Document) {
    router.push({ pathname: "/document/[id]", params: { id: doc.id } });
  }
  const canAdd =
    session?.demo ||
    session?.user.role === "ADMIN" ||
    session?.user.grants.some((g) => g.actions.includes("ingest"));
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.canvas,
        paddingTop: insets.top,
      }}
    >
      <FlashList
        data={docs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        onRefresh={() => {
          if (mode === "saved") savedQueries.forEach((q) => void q.refetch());
          else void query.refetch();
        }}
        refreshing={
          mode === "recent" && query.isRefetching && !query.isFetchingNextPage
        }
        ListHeaderComponent={
          <View style={{ gap: 16, paddingTop: 16, paddingBottom: 4 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Brand wordmark />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open workspace"
                onPress={() => router.navigate("/workspace")}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.accentSoft,
                }}
              >
                <Text tone="accent" style={{ fontWeight: "600" }}>
                  {session?.user.name?.[0]?.toUpperCase() || "D"}
                </Text>
              </Pressable>
            </View>
            <Text size="title" accessibilityRole="header">
              Documents
            </Text>
            {!text && !type && mode === "recent" && (
              <View
                style={{
                  backgroundColor: colors.hero,
                  borderRadius: 16,
                  borderCurve: "continuous",
                  padding: 16,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 23,
                      lineHeight: 29,
                      letterSpacing: -0.6,
                      fontWeight: "600",
                      color: colors.onHero,
                    }}
                  >
                    Your workspace, in focus.
                  </Text>
                  <Icon
                    name="documents-outline"
                    size={36}
                    color={colors.heroMuted}
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    borderTopWidth: 1,
                    borderTopColor: "#567465",
                    paddingTop: 4,
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ask your documents"
                    onPress={() => router.navigate("/ask")}
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 48,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text size="label" style={{ color: colors.onHero }}>
                      Ask your documents
                    </Text>
                    <Icon
                      name="arrow-up-right-box-outline"
                      size={18}
                      color={colors.onHero}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="View saved documents"
                    onPress={() => setMode("saved")}
                    style={({ pressed }) => ({
                      minHeight: 48,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Icon
                      name="bookmark-outline"
                      size={18}
                      color={colors.heroMuted}
                    />
                    <Text size="label" style={{ color: colors.onHero }}>
                      {saved.length}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingLeft: 16,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 16,
                borderCurve: "continuous",
              }}
            >
              <Icon name="search" color={colors.secondary} />
              <TextInput
                accessibilityLabel="Find a document"
                placeholder="Find a document"
                value={text}
                onChangeText={setText}
                returnKeyType="search"
                autoCorrect={false}
                placeholderTextColor={colors.secondary}
                style={{
                  flex: 1,
                  color: colors.text,
                  fontSize: 16,
                  minHeight: 54,
                  paddingVertical: 12,
                }}
              />
              {text ? (
                <IconButton
                  name="close-circle"
                  label="Clear search"
                  onPress={() => setText("")}
                />
              ) : (
                <View style={{ width: 8 }} />
              )}
            </View>
            <Chips
              value={type}
              onChange={setType}
              options={[
                { label: "All", value: "" },
                { label: "Policies", value: "policy" },
                { label: "Contracts", value: "contract" },
                { label: "Reports", value: "report" },
              ]}
            />
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 24 }}
            >
              {["recent", "saved"].map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mode === value }}
                  onPress={() => setMode(value)}
                  style={{
                    minHeight: 48,
                    justifyContent: "center",
                    borderBottomWidth: mode === value ? 2 : 0,
                    borderBottomColor: colors.accent,
                  }}
                >
                  <Text
                    size="label"
                    tone={mode === value ? "accent" : "secondary"}
                  >
                    {value === "recent" ? "Recent" : "Saved"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={{ marginTop: -16 }}>
              <DemoNotice />
            </View>
            {localError ? <ErrorState error={localError} /> : null}
            {error ? (
              <ErrorState
                error={error}
                retry={() => {
                  if (mode === "saved")
                    savedQueries.forEach((q) => void q.refetch());
                  else void query.refetch();
                }}
              />
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
              onPressIn={() => {
                void queryClient.prefetchQuery({
                  queryKey: ["document", item.id],
                  queryFn: ({ signal }) => api.document(item.id, signal),
                });
              }}
              onPress={() => open(item)}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                paddingVertical: 18,
                backgroundColor: pressed ? colors.muted : "transparent",
              })}
            >
              <DocumentCover kind={typeOf(item) || "document"} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: "600", lineHeight: 23 }}>
                  {item.title}
                </Text>
                <Text size="small" tone="secondary">
                  {humanize(departmentOf(item))}
                  {item.totalPages
                    ? ` · ${item.totalPages} ${item.totalPages === 1 ? "page" : "pages"}`
                    : ""}
                </Text>
              </View>
            </Pressable>
            <IconButton
              name={saved.includes(item.id) ? "bookmark" : "bookmark-outline"}
              label={`${saved.includes(item.id) ? "Unsave" : "Save"} ${item.title}`}
              selected={saved.includes(item.id)}
              onPress={() =>
                void useApp
                  .getState()
                  .toggle("saved", item.id)
                  .catch(setLocalError)
              }
            />
          </View>
        )}
        ListEmptyComponent={
          pending ? (
            <Loading label="Finding your documents…" />
          ) : error ? null : (
            <Empty
              title={
                mode === "saved"
                  ? "Keep a document close"
                  : search || type
                    ? "No matches"
                    : "Your document desk is ready"
              }
              message={
                mode === "saved"
                  ? "Tap a bookmark to find it here."
                  : search || type
                    ? "Try a different name or clear the filters."
                    : "Add your first document to begin."
              }
              action={
                search || type
                  ? "Clear filters"
                  : canAdd && mode === "recent"
                    ? "Add document"
                    : undefined
              }
              onAction={() => {
                if (search || type) {
                  setText("");
                  setType("");
                } else router.push("/ingest");
              }}
            />
          )
        }
        ListFooterComponent={
          mode === "recent" && query.hasNextPage ? (
            <Button
              kind="quiet"
              label="Load more"
              busy={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            />
          ) : null
        }
      />
      {canAdd && (
        <View
          style={{
            paddingHorizontal: 24,
            paddingVertical: 12,
            alignItems: "stretch",
            backgroundColor: colors.canvas,
          }}
        >
          <Button
            label="Add document"
            icon="add"
            onPress={() => router.push("/ingest")}
          />
        </View>
      )}
    </View>
  );
}
