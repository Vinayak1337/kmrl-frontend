import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, queryClient } from "../src/api";
import {
  docTypes,
  humanize,
  teams,
  type ClassificationValues,
  type DocumentClassification,
} from "../src/domain";
import {
  Button,
  ErrorState,
  Field,
  Loading,
  Notice,
  Picker,
  Screen,
  Text,
} from "../src/ui";

const summary = (value: ClassificationValues) =>
  [
    value.department && humanize(value.department),
    value.documentType && humanize(value.documentType),
    ...value.tags,
  ]
    .filter(Boolean)
    .join(" · ") || "Unclassified";

export default function ClassificationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["classification", id],
    queryFn: ({ signal }) => api.classification(id, signal),
  });
  return (
    <Screen>
      <Text size="title">Document classification</Text>
      {query.isPending && <Loading label="Loading classification…" />}
      {query.error && (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      )}
      {query.data && <ClassificationForm id={id} current={query.data} />}
    </Screen>
  );
}

function ClassificationForm({
  id,
  current,
}: {
  id: string;
  current: DocumentClassification;
}) {
  const [draft, setDraft] = useState(current.effective);
  const [tags, setTags] = useState(current.effective.tags.join("\n"));
  const save = useMutation({
    mutationFn: () =>
      api.saveClassification(id, {
        ...draft,
        tags: tags
          .split("\n")
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(["classification", id], result);
      setDraft(result.effective);
      setTags(result.effective.tags.join("\n"));
      for (const key of [
        ["document", id],
        ["documents"],
        ["actions"],
        ["alerts"],
        ["section"],
      ]) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
  const options = (values: string[], original: string | null) =>
    [...new Set([original ?? "", ...values])].map((value) => ({
      value,
      label: humanize(value),
    }));
  const suggestion = current.suggestion;
  return (
    <>
      <View style={{ gap: 8 }}>
        <Text size="heading">AI suggestion</Text>
        <Text tone="secondary">
          {suggestion
            ? summary(suggestion)
            : "No suggestion is available for this document."}
        </Text>
        {current.canEdit && suggestion && (
          <Button
            kind="secondary"
            label="Use suggestion"
            disabled={save.isPending}
            onPress={() => {
              setDraft({
                department: suggestion.department ?? draft.department,
                documentType: suggestion.documentType ?? draft.documentType,
                tags: suggestion.tags.length ? suggestion.tags : draft.tags,
              });
              if (suggestion.tags.length) setTags(suggestion.tags.join("\n"));
              save.reset();
            }}
          />
        )}
      </View>
      {current.canEdit ? (
        <>
          <Notice message="Changing the team or type can change who can read this document." />
          <Picker
            label="Team"
            value={draft.department || ""}
            options={options(teams, current.effective.department)}
            onChange={(department) => {
              if (!save.isPending) {
                setDraft({ ...draft, department: department || null });
                save.reset();
              }
            }}
          />
          <Picker
            label="Document type"
            value={draft.documentType || ""}
            options={options(
              docTypes.map((type) =>
                type === "technical_document" ? "technical document" : type,
              ),
              current.effective.documentType,
            )}
            onChange={(documentType) => {
              if (!save.isPending) {
                setDraft({ ...draft, documentType: documentType || null });
                save.reset();
              }
            }}
          />
          <Field
            label="Tags"
            multiline
            value={tags}
            onChangeText={(value) => {
              setTags(value);
              save.reset();
            }}
            editable={!save.isPending}
          />
          <Text size="small" tone="secondary">
            Enter one tag per line.
          </Text>
          <Button
            label="Save classification"
            busy={save.isPending}
            onPress={() => {
              if (!save.isPending) save.mutate();
            }}
          />
          {save.error && <ErrorState error={save.error} />}
          {save.isSuccess && <Notice message="Classification saved." />}
        </>
      ) : (
        <View style={{ gap: 8 }}>
          <Text size="heading">Current classification</Text>
          <Text>{summary(current.effective)}</Text>
        </View>
      )}
      {current.history.length > 0 && (
        <View style={{ gap: 12 }}>
          <Text size="heading">Correction history</Text>
          {[...current.history].reverse().map((entry, index) => (
            <View key={`${entry.at}-${index}`} style={{ gap: 4 }}>
              <Text size="small" tone="secondary">
                {new Date(entry.at).toLocaleString("en-IN")}
              </Text>
              <Text>
                {summary(entry.before)} → {summary(entry.after)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}
