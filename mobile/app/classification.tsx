import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, queryClient } from "../src/api";
import {
  docTypes,
  humanize,
  ingestStageLabels,
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

function isRebuilding(record?: DocumentClassification) {
  return record?.processing?.status === "queued" || record?.processing?.status === "processing";
}

function refreshReader(id: string) {
  for (const key of [["document", id], ["documents"], ["actions"], ["alerts"], ["section"]]) {
    void queryClient.invalidateQueries({ queryKey: key });
  }
}

export default function ClassificationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({
    queryKey: ["classification", id],
    queryFn: ({ signal }) => api.classification(id, signal),
    refetchInterval: ({ state }) => isRebuilding(state.data) ? 3000 : false,
  });
  const rebuilding = isRebuilding(query.data);
  const completed = query.dataUpdatedAt;
  const previous = useRef(false);
  useEffect(() => {
    if (previous.current && !rebuilding && query.data && !query.data.processing) refreshReader(id);
    previous.current = rebuilding;
  }, [id, rebuilding, query.data]);
  return (
    <Screen>
      <Text size="title">Document classification</Text>
      {query.isPending && <Loading label="Loading classification…" />}
      {query.error && (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      )}
      {query.data && <ClassificationForm key={query.data.history.at(-1)?.at || "initial"} id={id} current={query.data} refreshedAt={completed} />}
    </Screen>
  );
}

function ClassificationForm({
  id,
  current,
  refreshedAt,
}: {
  id: string;
  current: DocumentClassification;
  refreshedAt: number;
}) {
  const initial = current.processing?.target || current.effective;
  const [draft, setDraft] = useState(initial);
  const [tags, setTags] = useState(initial.tags.join("\n"));
  const [note, setNote] = useState(current.processing?.note || "");
  const rebuilding = isRebuilding(current);
  const save = useMutation({
    mutationFn: () =>
      api.saveClassification(id, {
        ...draft,
        note: note.trim(),
        tags: tags
          .split("\n")
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(["classification", id], result);
      if (!result.processing) {
        setDraft(result.effective);
        setTags(result.effective.tags.join("\n"));
        setNote("");
        refreshReader(id);
      }
    },
  });
  const options = (values: string[], original: string | null) =>
    [...new Set([original ?? "", ...values])].map((value) => ({
      value,
      label: humanize(value),
    }));
  const suggestion = current.suggestion;
  const disabled = save.isPending || rebuilding;
  const completedRun = refreshedAt > 0 && !current.processing && current.history.length > 0;
  return (
    <>
      {rebuilding && <Notice message={current.processing?.stage ? ingestStageLabels[current.processing.stage] : "Waiting to rebuild the document…"} />}
      {current.processing?.status === "failed" && (
        <Notice error message={current.processing.error || "Rebuilding failed. Save the correction again to retry."} />
      )}
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
            disabled={disabled}
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
          <Notice message="Saving a correction rebuilds the document. Changing the team or type can change who can read it." />
          <Picker
            label="Team"
            value={draft.department || ""}
            options={options(teams, current.effective.department)}
            onChange={(department) => {
              if (!disabled) {
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
              if (!disabled) {
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
            editable={!disabled}
          />
          <Text size="small" tone="secondary">
            Enter one tag per line.
          </Text>
          <Field
            label="Correction note (optional)"
            multiline
            maxLength={1000}
            value={note}
            onChangeText={setNote}
            editable={!disabled}
          />
          <Button
            label="Save classification"
            disabled={disabled}
            busy={save.isPending}
            onPress={() => {
              if (!disabled) save.mutate();
            }}
          />
          {save.error && <ErrorState error={save.error} />}
          {!current.processing && (save.isSuccess || completedRun) && <Notice message="Classification saved." />}
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
              {entry.note && <Text tone="secondary">{entry.note}</Text>}
            </View>
          ))}
        </View>
      )}
    </>
  );
}
