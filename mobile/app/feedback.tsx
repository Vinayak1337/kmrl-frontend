import { useState } from "react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useMutation } from "@tanstack/react-query";
import { useApp } from "../src/store";
import { api } from "../src/api";
import {
  Button,
  confirm,
  ErrorState,
  Field,
  Notice,
  Screen,
  Text,
  success,
} from "../src/ui";
export default function Feedback() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const router = useRouter();
  const session = useApp((s) => s.session);
  const navigation = useNavigation();
  const [message, setMessage] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.feedback(id, message.trim()),
    onSuccess: () => success(),
  });
  usePreventRemove(
    !!session && !!message && !mutation.isSuccess,
    ({ data }) => {
      if (!mutation.isPending)
        void confirm(
          "Discard feedback?",
          "Your feedback has not been sent.",
          "Discard",
        ).then((ok) => {
          if (ok) navigation.dispatch(data.action);
        });
    },
  );
  return (
    <Screen>
      <Text size="heading">{title || "Document feedback"}</Text>
      {mutation.isSuccess ? (
        <>
          <Notice message="Feedback recorded. The original document is unchanged." />
          <Button label="Done" onPress={() => router.back()} />
        </>
      ) : (
        <>
          <Field
            label="What needs fixing?"
            placeholder="Tell us which section and what is incorrect…"
            multiline
            style={{ minHeight: 180 }}
            value={message}
            onChangeText={setMessage}
            editable={!mutation.isPending}
            maxLength={4000}
          />
          <Text size="small" tone="secondary">
            Feedback records an issue. It does not rewrite the source.
          </Text>
          {mutation.error && <ErrorState error={mutation.error} />}
          <Button
            label="Send feedback"
            onPress={() => mutation.mutate()}
            busy={mutation.isPending}
            disabled={!message.trim()}
          />
        </>
      )}
    </Screen>
  );
}
