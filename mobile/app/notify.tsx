import { useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, queryClient } from "../src/api";
import { daysLabel, isEmail } from "../src/domain";
import { useTheme, useTierColor } from "../src/theme";
import {
  Button,
  Empty,
  ErrorState,
  Field,
  Icon,
  Loading,
  Notice,
  Screen,
  Text,
  success,
} from "../src/ui";

export default function Notify() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const tierColor = useTierColor();
  const query = useQuery({
    queryKey: ["alerts"],
    queryFn: ({ signal }) => api.alerts(signal),
  });
  const alert = query.data?.alerts.find((a) => a.id === id);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [extra, setExtra] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [inputError, setInputError] = useState("");
  const chosen =
    selected ?? (alert?.authorities.slice(0, 1).map((a) => a.email) || []);
  const mutation = useMutation({
    mutationFn: (recipients: string[]) => api.notify(id, recipients, note),
    onSuccess: () => {
      success();
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  if (mutation.isSuccess)
    return (
      <Screen>
        <Text size="heading">
          {mutation.data.recorded.length
            ? `Notification recorded for ${mutation.data.recorded.length} ${mutation.data.recorded.length === 1 ? "person" : "people"}`
            : "Everyone selected was already informed"}
        </Text>
        {mutation.data.duplicates.length > 0 && (
          <Text tone="secondary">
            Already informed: {mutation.data.duplicates.join(", ")}
          </Text>
        )}
        <Notice message="Saved and linked to this deadline. Email delivery will start once the mail server is connected." />
        <Button label="Done" onPress={() => router.back()} />
      </Screen>
    );

  if (query.isPending) return <Loading />;
  if (query.error)
    return (
      <Screen>
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      </Screen>
    );
  if (!alert)
    return (
      <Screen>
        <Empty
          icon="calendar-outline"
          title="Deadline not found"
          message="It may have changed. Go back and refresh the list."
        />
      </Screen>
    );

  const informed = new Set(alert.notifications.flatMap((n) => n.recipients));
  const toggle = (email: string) =>
    setSelected(
      chosen.includes(email)
        ? chosen.filter((e) => e !== email)
        : [...chosen, email],
    );
  const add = () => {
    const emails = draft
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const invalid = emails.filter((e) => !isEmail(e));
    if (invalid.length) {
      setInputError(`Check ${invalid.join(", ")}`);
      return;
    }
    const known = new Set([...alert.authorities.map((a) => a.email), ...extra]);
    setExtra([...extra, ...emails.filter((e) => !known.has(e))]);
    setSelected([...new Set([...chosen, ...emails])]);
    setDraft("");
    setInputError("");
  };
  const option = (email: string, label?: string) => {
    const on = chosen.includes(email);
    return (
      <Pressable
        key={email}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
        accessibilityLabel={`${label || email}${informed.has(email) ? ", already informed" : ""}`}
        onPress={() => toggle(email)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          minHeight: 56,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: on ? colors.accent : colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Icon name={on ? "checkbox" : "square-outline"} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "600" }}>{label || email}</Text>
          {label && (
            <Text size="small" tone="secondary">
              {email}
            </Text>
          )}
        </View>
        {informed.has(email) && (
          <Text size="small" style={{ color: colors.success }}>
            Informed
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <Screen>
      <View
        style={{
          borderLeftWidth: 3,
          borderLeftColor: tierColor(alert.tier),
          paddingLeft: 14,
          gap: 6,
        }}
      >
        <Text size="small" style={{ fontWeight: "700" }}>
          {daysLabel(alert.daysLeft)}
        </Text>
        <Text>{alert.requirement}</Text>
        <Text size="small" tone="secondary">
          {alert.documentTitle}
          {alert.pageStart ? ` · p. ${alert.pageStart}` : ""}
        </Text>
      </View>
      <Text size="label">Concerned authorities</Text>
      {alert.authorities.length ? (
        <Text size="small" tone="secondary">
          Found in the document, nearest first.
        </Text>
      ) : (
        <Text size="small" tone="secondary">
          No email addresses were found in this document. Add one below.
        </Text>
      )}
      <View style={{ gap: 8 }}>
        {alert.authorities.map((a) => option(a.email, a.label))}
        {extra.map((e) => option(e))}
      </View>
      <Field
        label="Add someone else"
        placeholder="name@organisation.in"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={add}
        returnKeyType="done"
      />
      {draft.trim() !== "" && (
        <Button
          label="Add recipient"
          kind="secondary"
          icon="add"
          onPress={add}
        />
      )}
      {inputError !== "" && (
        <Text size="small" tone="danger">
          {inputError}
        </Text>
      )}
      <Field
        label="Note (optional)"
        placeholder="Add context for the recipients"
        multiline
        style={{ minHeight: 100 }}
        value={note}
        onChangeText={setNote}
        maxLength={1000}
      />
      {mutation.error && <ErrorState error={mutation.error} />}
      <Button
        label={chosen.length ? `Inform ${chosen.length}` : "Inform"}
        icon="notifications-outline"
        busy={mutation.isPending}
        disabled={!chosen.length}
        onPress={() => mutation.mutate(chosen)}
      />
    </Screen>
  );
}
