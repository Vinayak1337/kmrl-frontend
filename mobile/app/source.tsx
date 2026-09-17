import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { api } from "../src/api";
import { useApp } from "../src/store";
import { languages, pageLabel } from "../src/domain";
import {
  Button,
  Chips,
  ErrorState,
  Loading,
  Notice,
  Picker,
  Screen,
  Text,
} from "../src/ui";
export default function Source() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const demo = useApp((s) => s.session?.demo);
  const [view, setView] = useState("source");
  const [language, setLanguage] = useState("Hindi");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const query = useQuery({
    queryKey: ["section", uid],
    queryFn: ({ signal }) => api.section(uid, signal),
  });
  const translate = useMutation({
    mutationFn: () =>
      api.translate(
        query.data!.node.summary || query.data!.node.content,
        language,
      ),
  });
  if (query.isPending)
    return (
      <Screen>
        <Loading label="Opening the exact source…" />
      </Screen>
    );
  if (query.error || !query.data)
    return (
      <Screen>
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      </Screen>
    );
  const node = query.data.node;
  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Text size="title">{node.title || `Section ${node.order}`}</Text>
        <Text tone="secondary">{pageLabel(node.pageRange)}</Text>
      </View>
      <Chips
        value={view}
        onChange={setView}
        options={[
          { label: "Source", value: "source" },
          { label: "Summary", value: "summary" },
        ]}
      />
      <Text selectable style={{ lineHeight: 28 }}>
        {view === "source"
          ? node.content || "No text was extracted from this section."
          : node.summary || "No summary is available."}
      </Text>
      {!!error && <ErrorState error={error} />}
      <Button
        kind="secondary"
        label={copied ? "Copied" : "Copy text"}
        icon="copy-outline"
        onPress={() => {
          void Clipboard.setStringAsync(
            view === "source" ? node.content : node.summary,
          )
            .then(() => setCopied(true))
            .catch(setError);
        }}
      />
      {!demo && view === "summary" && (
        <>
          <Picker
            label="Translate summary"
            value={language}
            options={languages.map((l) => ({ label: l, value: l }))}
            onChange={(value) => {
              setLanguage(value);
              translate.reset();
            }}
          />
          <Button
            kind="secondary"
            label="Translate"
            busy={translate.isPending}
            onPress={() => translate.mutate()}
          />
          {translate.error && <ErrorState error={translate.error} />}
          {translate.data && (
            <>
              <Notice
                message={`Translated summary · ${language}. The source is unchanged.`}
              />
              <Text selectable>{translate.data.summary}</Text>
            </>
          )}
        </>
      )}
      <Button
        label="Ask about this document"
        icon="chatbubble-outline"
        onPress={() =>
          router.push({
            pathname: "/conversation",
            params: { docId: node.docId, title: node.title },
          })
        }
      />
    </Screen>
  );
}
