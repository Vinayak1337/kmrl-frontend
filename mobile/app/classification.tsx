import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, queryClient } from "../src/api";
import {
  docTypes,
  humanize,
  ingestStageLabel,
  pageLabel,
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
  const { id, sectionId } = useLocalSearchParams<{ id: string; sectionId?: string }>();
  const query = useQuery({
    queryKey: ["classification", id],
    queryFn: ({ signal }) => api.classification(id, signal),
    refetchInterval: ({ state }) => isRebuilding(state.data) ? 3000 : false,
  });
  const rebuilding = isRebuilding(query.data);
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
      {query.data && <ClassificationForm id={id} initialTarget={sectionId} current={query.data} />}
    </Screen>
  );
}

function ClassificationForm({
  id,
  current,
  initialTarget,
}: {
  id: string;
  current: DocumentClassification;
  initialTarget?: string;
}) {
  const initial = current.effective;
  const [draft, setDraft] = useState(initial);
  const [tags, setTags] = useState(initial.tags.join("\n"));
  const [note, setNote] = useState(current.processing?.note || "");
  const scope = current.processing?.scope;
  const [target, setTarget] = useState(scope?.kind === "brief" ? "brief" : scope?.nodeId || initialTarget || "auto");
  const rebuilding = isRebuilding(current);
  const priorRun = useRef(false);
  const [corrected, setCorrected] = useState(false);
  useEffect(() => {
    if (priorRun.current && !rebuilding && !current.processing) {
      setNote("");
      setTarget("auto");
      setCorrected(true);
    }
    priorRun.current = rebuilding;
  }, [rebuilding, current.processing]);
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
      queryClient.setQueryData(["classification", id], { ...result, targets: current.targets });
      setDraft(result.effective);
      setTags(result.effective.tags.join("\n"));
      refreshReader(id);
    },
  });
  const correction = useMutation({
    mutationFn: () => api.saveSummaryCorrection(id, note.trim(), target),
    onMutate: () => setCorrected(false),
    onSuccess: result => queryClient.setQueryData(["classification", id], result),
  });
  const options = (values: string[], original: string | null) =>
    [...new Set([original ?? "", ...values])].map((value) => ({
      value,
      label: humanize(value),
    }));
  const suggestion = current.suggestion;
  const disabled = save.isPending || correction.isPending || rebuilding;
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
          <Notice message="Changing the team or type can change who can read this document." />
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
          <Button label="Save classification" disabled={disabled} busy={save.isPending} onPress={() => save.mutate()} />
          {save.error && <ErrorState error={save.error} />}
          {save.isSuccess && <Notice message="Classification saved." />}
          <Text size="heading">Correct a summary</Text>
          <Picker
            label="What should be rebuilt?"
            value={target}
            options={[
              { value: "auto", label: "Find the target from the note" },
              { value: "brief", label: "Document brief" },
              ...(current.targets || []).map(section => ({
                value: section.nodeId,
                label: `${section.title || "Section"} · ${pageLabel(section.pageRange)}`,
              })),
            ]}
            onChange={value => { if (!disabled) setTarget(value); }}
          />
          <Field
            label="Correction note"
            multiline
            maxLength={1000}
            value={note}
            onChangeText={setNote}
            editable={!disabled}
          />
          <Button label="Save correction" disabled={disabled || !note.trim()} busy={correction.isPending} onPress={() => correction.mutate()} />
          {rebuilding && (
            <View accessibilityLiveRegion="polite">
              <Notice message={current.processing?.stage ? ingestStageLabel(current.processing.stage, current.processing.analysis) : "Waiting to rebuild the summary…"} />
            </View>
          )}
          {current.processing?.status === "failed" && (
            <Notice error message={current.processing.error || "Rebuilding failed. Save the correction again to retry."} />
          )}
          {correction.error && <ErrorState error={correction.error} />}
          {corrected && <Notice message="Correction applied." />}
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
                {entry.scope?.kind === "brief" ? "Document brief corrected" : entry.scope?.kind === "section" ? "Section summary corrected" : `${summary(entry.before)} → ${summary(entry.after)}`}
              </Text>
              {entry.note && <Text tone="secondary">{entry.note}</Text>}
            </View>
          ))}
        </View>
      )}
    </>
  );
}
