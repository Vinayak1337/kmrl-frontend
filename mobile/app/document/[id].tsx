import { SectionSource } from "../../src/SectionSource";
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
  languages,
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
  Picker,
  Row,
  Screen,
  Text,
} from "../../src/ui";

const activityDate = (value?: string) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

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
  const [showTranslation, setShowTranslation] = useState(false);
  const [language, setLanguage] = useState("Hindi");
  const query = useQuery({
    queryKey: ["document", id],
    queryFn: ({ signal }) => api.document(id, signal),
  });
  const documentActions = useQuery({
    queryKey: ["actions"],
    queryFn: ({ signal }) => api.actions(signal),
    enabled: tab === "actions",
  });
  const translation = useMutation({
    mutationFn: async () => {
      const source = summaryOf(query.data!);
      return { source, translated: await api.translate(source, language) };
    },
  });
  const remove = useMutation({
    mutationFn: () => api.remove(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["document", id] });
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      void queryClient.invalidateQueries({ queryKey: ["actions"] });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
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
  const listedActions = documentActions.data?.actions.filter(action => action.documentId === id) || [];
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
            { label: "Actions", value: "actions" },
            { label: "Source", value: "source" },
            { label: "Activity", value: "activity" },
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
            {!session?.demo && !!summaryOf(doc) && (
              <View style={{ gap: 12 }}>
                <Button kind="secondary" label={showTranslation ? "Close brief translation" : "Translate brief"} onPress={() => setShowTranslation(open => !open)} />
                {showTranslation && <>
                  <Picker
                    label="Brief language"
                    value={language}
                    options={languages.map(value => ({ value, label: value }))}
                    onChange={value => { if (!translation.isPending) { setLanguage(value); translation.reset(); } }}
                  />
                  <Button label="Translate" busy={translation.isPending} onPress={() => translation.mutate()} />
                  {translation.error && <ErrorState error={translation.error} />}
                  {translation.data?.source === summaryOf(doc) && <>
                    <Text size="heading">Translation · {language}</Text>
                    <Text selectable>{translation.data.translated.summary}</Text>
                  </>}
                </>}
              </View>
            )}
            {!!doc.metadata?.tags?.length && (
              <Text tone="secondary">Tags · {doc.metadata.tags.join(" · ")}</Text>
            )}
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
        {tab === "actions" && (
          <View style={{ gap: 16 }}>
            <Text size="heading">Actions in this document</Text>
            {documentActions.isPending ? <Loading label="Loading actions…" /> : documentActions.error ? (
              <ErrorState error={documentActions.error} retry={() => void documentActions.refetch()} />
            ) : listedActions.length ? listedActions.map(action => (
              <View key={action.id} style={{ gap: 8 }}>
                <Text selectable>{action.action}</Text>
                <Text size="small" tone="secondary">
                  {[action.team, action.dueDate && `Due ${action.dueDate}`, action.sectionTitle].filter(Boolean).join(" · ")}
                </Text>
                {!!action.sectionId && (
                  <Button
                    kind="secondary"
                    label={action.sectionTitle ? `Read section ${action.sectionTitle}` : "Read section"}
                    onPress={() => router.push({ pathname: "/source", params: { uid: `${id}#${action.sectionId}` } })}
                  />
                )}
              </View>
            )) : <Text tone="secondary">No actions recorded for this document.</Text>}
          </View>
        )}
        {tab === "activity" && (
          <View style={{ gap: 12 }}>
            <Text size="heading">Document activity</Text>
            <Text>Added to workspace · {activityDate(doc.metadata?.createdAt || doc.createdAt)}</Text>
            {!!doc.metadata?.updatedAt && <Text>Last updated · {activityDate(doc.metadata.updatedAt)}</Text>}
            <Text>Processing status · Ready to read</Text>
            {session?.user.role === "ADMIN" && !session.demo && (
              <Button kind="secondary" label="Workspace audit history" onPress={() => router.push("/audit")} />
            )}
          </View>
        )}
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
            {!session?.demo && (doc.raw?.type || doc.raw?.url) && (
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
                  <SectionSource section={section} />
                </View>
              ))
            ) : (
              <Notice message="No searchable text is available for this document." />
            )}
          </>
        )}
        <DemoNotice />
        {!session?.demo && (
          <View>
            <Row
              icon="pricetag-outline"
              title="Classification"
              onPress={() =>
                router.push({ pathname: "/classification", params: { id } })
              }
            />
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
