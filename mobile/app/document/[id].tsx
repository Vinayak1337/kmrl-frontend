import { DocumentCover } from "../../src/DocumentCover";
import { useState } from "react";
import { Share, View } from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, queryClient } from "../../src/api";
import { useTheme } from "../../src/theme";
import { useApp } from "../../src/store";
import {
  departmentOf,
  humanize,
  pageLabel,
  summaryOf,
  typeOf,
} from "../../src/domain";
import { imageMime, openOriginal } from "../../src/fileTools";
import {
  Button,
  Chips,
  confirm,
  DemoNotice,
  Empty,
  ErrorState,
  Icon,
  IconButton,
  Loading,
  Notice,
  Row,
  Screen,
  Text,
} from "../../src/ui";

export default function Reader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const session = useApp((s) => s.session);
  const saved = useApp((s) => s.preferences.saved.includes(id));
  const [tab, setTab] = useState("overview");
  const [error, setError] = useState<unknown>(null);
  const [sharing, setSharing] = useState(false);
  const query = useQuery({
    queryKey: ["document", id],
    queryFn: ({ signal }) => api.document(id, signal),
  });
  const remove = useMutation({
    mutationFn: () => api.remove(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["document", id] });
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      void queryClient.invalidateQueries({ queryKey: ["actions"] });
      if (saved)
        void useApp
          .getState()
          .toggle("saved", id)
          .catch(() => {});
      router.dismissTo("/");
    },
  });
  const doc = query.data;
  if (query.isPending)
    return (
      <Screen>
        <Loading label="Opening document…" />
      </Screen>
    );
  if (query.error || !doc)
    return (
      <Screen>
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      </Screen>
    );
  const sections = doc.nodes || [];
  const keyPoints = [...new Set(sections.flatMap((s) => s.keyPoints || []))];
  const actions = sections.flatMap((s) => s.actionableItems || []);
  async function shareOriginal() {
    if (!doc || sharing) return;
    setSharing(true);
    setError(null);
    try {
      await openOriginal(doc);
    } catch (e) {
      setError(e);
    } finally {
      setSharing(false);
    }
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <View style={{ flexDirection: "row" }}>
              <IconButton
                name={saved ? "bookmark" : "bookmark-outline"}
                label={saved ? "Unsave document" : "Save document"}
                selected={saved}
                onPress={() =>
                  void useApp.getState().toggle("saved", id).catch(setError)
                }
              />
              <IconButton
                name="share-outline"
                label="Share document link"
                onPress={() =>
                  void Share.share({
                    title: doc.title,
                    message: `${doc.title}\n${session?.demo ? "Sample DocSetu document" : `${session?.baseUrl}/documents/${encodeURIComponent(id)}`}`,
                  }).catch(setError)
                }
              />
            </View>
          ),
        }}
      />
      <Screen style={{ gap: 24 }}>
        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
          <DocumentCover kind={typeOf(doc) || "document"} large />
          <View style={{ flex: 1, gap: 8 }}>
            <Text
              size="small"
              tone="accent"
              style={{ letterSpacing: 1.2, fontWeight: "600" }}
            >
              {humanize(typeOf(doc)).toUpperCase()}
            </Text>
            <Text
              accessibilityRole="header"
              size="title"
              style={{ fontSize: 28, lineHeight: 35 }}
            >
              {doc.title}
            </Text>
            <Text tone="secondary">
              {humanize(departmentOf(doc))}
              {doc.totalPages
                ? ` · ${doc.totalPages} ${doc.totalPages === 1 ? "page" : "pages"}`
                : ""}
            </Text>
          </View>
        </View>
        <Chips
          value={tab}
          onChange={setTab}
          options={[
            { label: "Overview", value: "overview" },
            { label: "Sections", value: "sections" },
            { label: "Source", value: "source" },
          ]}
        />
        {!!error && <ErrorState error={error} />}
        {remove.error && <ErrorState error={remove.error} />}
        {tab === "overview" && (
          <>
            <View
              style={{
                gap: 12,
                padding: 20,
                backgroundColor: colors.surface,
                borderRadius: 16,
                borderCurve: "continuous",
                borderLeftWidth: 3,
                borderLeftColor: colors.accent,
              }}
            >
              <Text
                size="small"
                tone="secondary"
                style={{ letterSpacing: 1.8, fontWeight: "600" }}
              >
                AT A GLANCE
              </Text>
              <Text selectable style={{ fontSize: 18, lineHeight: 29 }}>
                {summaryOf(doc) || "No summary is available for this document."}
              </Text>
            </View>
            {keyPoints.length > 0 && (
              <View style={{ gap: 16 }}>
                <Text size="heading">Key points</Text>
                {keyPoints.map((point, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      gap: 16,
                      paddingBottom: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 16,
                        backgroundColor: colors.accentSoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        size="small"
                        tone="accent"
                        style={{
                          fontWeight: "600",
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {i + 1}
                      </Text>
                    </View>
                    <Text selectable style={{ flex: 1 }}>
                      {point}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {sections
              .flatMap((s) => s.criticalFlags || [])
              .map((flag, i) => (
                <Notice key={i} message={flag} />
              ))}
            {actions.length > 0 && (
              <View
                style={{
                  backgroundColor: colors.accentSoft,
                  padding: 16,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.accent,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontWeight: "600" }}>
                  {actions.length} {actions.length === 1 ? "action" : "actions"}{" "}
                  to review
                </Text>
                {actions.map((action, i) => (
                  <Text key={i} style={{ marginTop: 12 }} selectable>
                    {action}
                  </Text>
                ))}
              </View>
            )}
            {sections.length > 0 && (
              <Row
                title={sections[0].title || "Read the source"}
                subtitle={pageLabel(sections[0].pageRange)}
                icon="document-text-outline"
                onPress={() =>
                  router.push({
                    pathname: "/source",
                    params: {
                      uid: sections[0].uid || `${id}#${sections[0].nodeId}`,
                    },
                  })
                }
              />
            )}
          </>
        )}
        {tab === "sections" &&
          (sections.length ? (
            <View>
              {sections.map((section) => (
                <Row
                  key={section.nodeId}
                  title={section.title || `Section ${section.order}`}
                  subtitle={`${pageLabel(section.pageRange)}${section.summary ? ` · ${section.summary}` : ""}`}
                  icon="document-text-outline"
                  onPress={() =>
                    router.push({
                      pathname: "/source",
                      params: { uid: section.uid || `${id}#${section.nodeId}` },
                    })
                  }
                />
              ))}
            </View>
          ) : (
            <Empty
              title="No sections yet"
              message="This record has no extracted text sections."
            />
          ))}
        {tab === "source" && (
          <>
            <Text tone="secondary" size="small">
              Extracted source · unchanged text
            </Text>
            {doc.raw?.type === "image" && doc.raw.content && (
              <Image
                source={{
                  uri: doc.raw.content.startsWith("data:")
                    ? doc.raw.content
                    : `data:${imageMime(doc.raw.content)};base64,${doc.raw.content}`,
                }}
                style={{
                  width: "100%",
                  height: 360,
                  backgroundColor: colors.muted,
                }}
                contentFit="contain"
                accessibilityLabel="Original document image"
              />
            )}
            {(doc.raw?.content || doc.raw?.url) && (
              <Button
                kind="secondary"
                label="Open original file"
                icon="download-outline"
                busy={sharing}
                onPress={() => void shareOriginal()}
              />
            )}
            {sections.length ? (
              sections.map((section) => (
                <View key={section.nodeId} style={{ gap: 12 }}>
                  <Text size="heading">
                    {section.title || `Section ${section.order}`}
                  </Text>
                  <Text size="small" tone="secondary">
                    {pageLabel(section.pageRange)}
                  </Text>
                  <Text selectable>
                    {section.content ||
                      "No text was extracted from this section."}
                  </Text>
                </View>
              ))
            ) : (
              <Notice message="No searchable text is available. Image records are preserved without automatic text extraction." />
            )}
          </>
        )}
        <DemoNotice />
        {!session?.demo && (
          <View>
            <Row
              icon="flag-outline"
              title="Report an issue"
              onPress={() =>
                router.push({
                  pathname: "/feedback",
                  params: { id, title: doc.title },
                })
              }
            />
            {session?.user.role === "ADMIN" && (
              <Button
                kind="danger"
                label="Delete document"
                busy={remove.isPending}
                onPress={() => {
                  void confirm(
                    "Delete document?",
                    `“${doc.title}” will be permanently removed.`,
                  ).then((ok) => {
                    if (ok && !remove.isPending) remove.mutate();
                  });
                }}
              />
            )}
          </View>
        )}
      </Screen>
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Button
          label="Ask this document"
          icon="chatbubble-outline"
          onPress={() =>
            router.push({
              pathname: "/conversation",
              params: { docId: id, title: doc.title },
            })
          }
        />
      </View>
    </View>
  );
}
