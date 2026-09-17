import { Markdown } from "./Markdown";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { api, queryClient } from "./api";
import { useTheme } from "./theme";
import { citationUid, pageLabel, type Message, type History } from "./domain";
import {
  Brand,
  Icon,
  type IconName,
  Button,
  DemoNotice,
  ErrorState,
  Loading,
  Notice,
  Row,
  Text,
} from "./ui";

export function ChatScreen({
  docId,
  title,
}: {
  docId?: string;
  title?: string;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useRef<ScrollView>(null);
  const input = useRef<TextInput>(null);
  const [draft, setDraft] = useState("");
  const [pendingText, setPendingText] = useState("");
  const lock = useRef(false);
  const key = ["history", docId || "global"];
  const history = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.history(docId, signal),
  });
  const ask = useMutation({
    mutationFn: (query: string) =>
      api.ask(query, docId, history.data?.sessionId),
    onSuccess: (data, question) => {
      queryClient.setQueryData<History>(key, (old) => ({
        sessionId: data.sessionId,
        messages: [
          ...(old?.messages || []),
          { role: "user", content: question },
          {
            role: "assistant",
            content: data.reply,
            citations: data.citations,
            generation: data.generation,
          },
        ],
        citations: data.citations,
      }));
      setDraft("");
      setPendingText("");
    },
    onSettled: () => {
      lock.current = false;
    },
  });
  function send(value = draft) {
    const text = value.trim();
    if (!text || lock.current || history.isPending || history.isError) return;
    lock.current = true;
    setDraft(text);
    setPendingText(text);
    ask.mutate(text);
  }
  const messages: Message[] = history.data?.messages || [];
  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: colors.canvas,
        paddingTop: docId ? 0 : insets.top,
      }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={docId ? insets.top + 44 : 0}
    >
      <ScrollView
        ref={list}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 24, gap: 24, flexGrow: 1 }}
        onContentSizeChange={() => {
          if (messages.length) list.current?.scrollToEnd({ animated: false });
        }}
      >
        {!docId && (
          <>
            <Brand wordmark />
            <Text size="title" accessibilityRole="header">
              Ask DocSetu
            </Text>
          </>
        )}
        {docId && title && <Row icon="document-text-outline" title={title} />}
        <DemoNotice />
        {history.isPending ? (
          <Loading label="Opening conversation…" />
        ) : history.error ? (
          <ErrorState
            error={history.error}
            retry={() => void history.refetch()}
          />
        ) : messages.length === 0 && !ask.isPending ? (
          <View style={{ gap: 16 }}>
            <View
              style={{
                padding: 24,
                gap: 20,
                backgroundColor: colors.hero,
                borderRadius: 16,
                borderCurve: "continuous",
              }}
            >
              <Text
                style={{
                  fontSize: 28,
                  lineHeight: 35,
                  fontWeight: "600",
                  letterSpacing: -0.7,
                  color: colors.onHero,
                }}
              >
                Find the answer. Keep the source.
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon
                  name="documents-outline"
                  size={20}
                  color={colors.heroMuted}
                />
                <Text size="small" style={{ color: colors.heroMuted }}>
                  {docId ? "This document" : "Your accessible documents"}
                </Text>
              </View>
            </View>
            {[
              {
                title: "Summarize the key points",
                hint: "The essentials, with evidence",
                icon: "document-text-outline",
              },
              {
                title: "What needs my attention?",
                hint: "Actions and critical details",
                icon: "checkbox-outline",
              },
              {
                title: "Which deadlines are mentioned?",
                hint: "Dates worth keeping in view",
                icon: "time-outline",
              },
            ].map((q) => (
              <Pressable
                key={q.title}
                accessibilityRole="button"
                accessibilityLabel={q.title}
                onPress={() => send(q.title)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  minHeight: 84,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 16,
                  borderCurve: "continuous",
                  backgroundColor: pressed ? colors.muted : colors.surface,
                })}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 24,
                    backgroundColor: colors.accentSoft,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={q.icon as IconName} color={colors.accent} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text size="label">{q.title}</Text>
                  <Text size="small" tone="secondary">
                    {q.hint}
                  </Text>
                </View>
                <Icon name="arrow-forward" size={20} color={colors.accent} />
              </Pressable>
            ))}
          </View>
        ) : null}
        {messages.map((message, index) => {
          const citations =
            message.citations ||
            (index === messages.length - 1 ? history.data?.citations : []) ||
            [];
          return (
            <View
              key={`${index}-${message.role}`}
              style={{
                gap: 16,
                ...(message.role === "user"
                  ? {
                      backgroundColor: colors.accentSoft,
                      padding: 16,
                      borderRadius: 16,
                      borderCurve: "continuous",
                      alignSelf: "flex-end",
                      maxWidth: "92%",
                    }
                  : {}),
              }}
            >
              {message.role === "assistant" && (
                <View
                  style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
                >
                  <Brand size={24} />
                  <Text size="small" tone="accent">
                    DocSetu
                  </Text>
                </View>
              )}
              <Markdown>{message.content}</Markdown>
              {message.role === "assistant" &&
                message.generation === "fallback" && (
                  <Notice message="Source-based extract. An AI summary was unavailable." />
                )}
              {message.role === "assistant" && citations.length > 0 && (
                <View
                  style={{
                    paddingHorizontal: 16,
                    backgroundColor: colors.accentSoft,
                    borderRadius: 16,
                    borderCurve: "continuous",
                  }}
                >
                  <Text
                    size="small"
                    tone="accent"
                    style={{
                      paddingTop: 16,
                      fontWeight: "600",
                      letterSpacing: 1,
                    }}
                  >
                    SOURCES · {citations.length}
                  </Text>
                  {citations.map((c, i) => (
                    <Row
                      key={`${c.uid || c.nodeId}-${i}`}
                      icon="document-text-outline"
                      title={c.title || `Source ${c.index || i + 1}`}
                      subtitle={pageLabel(c.pageRange)}
                      onPress={() => {
                        const uid = citationUid(c);
                        if (uid)
                          router.push({ pathname: "/source", params: { uid } });
                        else
                          router.push({
                            pathname: "/document/[id]",
                            params: { id: c.docId },
                          });
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}
        {ask.isPending && (
          <>
            <View
              style={{
                alignSelf: "flex-end",
                padding: 16,
                backgroundColor: colors.accentSoft,
                borderRadius: 16,
              }}
            >
              <Text>{pendingText}</Text>
            </View>
            <Loading label="Reading the documents…" />
          </>
        )}
        {ask.error && <ErrorState error={ask.error} />}
      </ScrollView>
      <View
        style={{
          padding: 16,
          paddingBottom: Math.max(docId ? insets.bottom : 0, 16),
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          <TextInput
            ref={input}
            accessibilityLabel="Your question"
            value={draft}
            onChangeText={setDraft}
            placeholder={
              messages.length ? "Ask a follow-up…" : "Ask a question…"
            }
            placeholderTextColor={colors.secondary}
            multiline
            maxLength={20000}
            editable={!ask.isPending}
            style={{
              flex: 1,
              minHeight: 52,
              maxHeight: 140,
              padding: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
              fontSize: 16,
            }}
          />
          <Button
            label="Send"
            icon="arrow-up"
            onPress={() => send()}
            busy={ask.isPending}
            disabled={!draft.trim() || history.isPending || history.isError}
            style={{ paddingHorizontal: 16 }}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
