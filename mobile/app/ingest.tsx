import { useRef, useState } from "react";
import { Platform, View } from "react-native";
import { Image } from "expo-image";
import { Stack, useNavigation, useRouter } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useMutation } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { api, queryClient } from "../src/api";
import { useApp } from "../src/store";
import {
  docTypes,
  teams,
  languages,
  humanize,
  validateIngest,
  type Ingest,
} from "../src/domain";
import {
  Button,
  Chips,
  confirm,
  ErrorState,
  Field,
  IconButton,
  Notice,
  Picker,
  Screen,
  Text,
  success,
} from "../src/ui";

export default function IngestScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const session = useApp((s) => s.session);
  const isAdmin = session?.user.role === "ADMIN";
  const availableGrants =
    session?.user.grants.filter((g) => g.actions.includes("ingest")) || [];
  const [mode, setMode] = useState("file");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [team, setTeam] = useState(
    isAdmin ? "OPERATIONS" : availableGrants[0]?.dept || "",
  );
  const [type, setType] = useState(
    isAdmin ? "report" : availableGrants[0]?.type.toLowerCase() || "",
  );
  const [language, setLanguage] = useState("English");
  const [source, setSource] = useState<Ingest["documents"][0] | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [picking, setPicking] = useState(false);
  const [finished, setFinished] = useState(false);
  const lock = useRef(false);
  const dirty = !!title.trim() || !!text.trim() || !!source;
  const ingest = useMutation({
    mutationFn: async () => {
      const input: Ingest = {
        title: title.trim(),
        department: team,
        documentType: type,
        language,
        documents:
          mode === "paste"
            ? [
                {
                  type: "text",
                  content: text,
                  filename: `${title.trim() || "document"}.txt`,
                },
              ]
            : source
              ? [source]
              : [],
      };
      const problem = validateIngest(input);
      if (problem) throw new Error(problem);
      if (session?.demo)
        throw new Error(
          "Sign in to a live workspace to add documents. This sample does not upload files.",
        );
      const result = await api.ingest(input);
      if (!result.documentId)
        throw new Error(
          "The server did not return a document reference. Check Documents before retrying.",
        );
      return result;
    },
    onSuccess: (data) => {
      setFinished(true);
      success();
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      void queryClient.invalidateQueries({ queryKey: ["actions"] });
      setTimeout(
        () =>
          router.replace({
            pathname: "/document/[id]",
            params: { id: data.documentId },
          }),
        0,
      );
    },
    onSettled: () => {
      lock.current = false;
    },
  });
  usePreventRemove(
    !!session && !finished && (dirty || ingest.isPending),
    ({ data }) => {
      if (ingest.isPending) return;
      void confirm(
        "Discard this draft?",
        "Your document has not been added.",
        "Discard",
      ).then((ok) => {
        if (ok) navigation.dispatch(data.action);
      });
    },
  );
  async function chooseFile() {
    if (picking) return;
    setPicking(true);
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/plain", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if ((file.size || 0) > 2_500_000)
        throw new Error("Choose a file smaller than 2.5 MB.");
      const kind =
        file.mimeType === "application/pdf" || /\.pdf$/i.test(file.name)
          ? "pdf"
          : file.mimeType?.startsWith("image/") ||
              /\.(png|jpe?g)$/i.test(file.name)
            ? "image"
            : "text";
      let content: string;
      if (Platform.OS === "web") {
        const blob = file.file || (await (await fetch(file.uri)).blob());
        if (kind === "text") content = await blob.text();
        else
          content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => resolve(String(reader.result).split(",")[1]);
            reader.readAsDataURL(blob);
          });
      } else
        content = await FileSystem.readAsStringAsync(file.uri, {
          encoding:
            kind === "text"
              ? FileSystem.EncodingType.UTF8
              : FileSystem.EncodingType.Base64,
        });
      if (content.length > 3_500_000)
        throw new Error("Choose a file smaller than 2.5 MB.");
      setSource({ type: kind, content, filename: file.name });
      setPreview(kind === "image" ? file.uri : "");
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    } catch (e) {
      setError(e);
    } finally {
      setPicking(false);
    }
  }
  async function capture() {
    if (picking) return;
    setPicking(true);
    setError(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted)
        throw new Error(
          "Camera access is off. Allow it in device settings, or choose a file.",
        );
      const photo = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.65,
        base64: true,
        allowsEditing: false,
      });
      if (photo.canceled) return;
      const asset = photo.assets[0];
      if (!asset.base64 || asset.base64.length > 3_500_000)
        throw new Error(
          "This photo is too large. Choose a smaller image file.",
        );
      setSource({
        type: "image",
        content: asset.base64,
        filename: "document-photo.jpg",
      });
      setPreview(asset.uri);
      if (!title) setTitle("Document photo");
    } catch (e) {
      setError(e);
    } finally {
      setPicking(false);
    }
  }
  const teamOptions = isAdmin
    ? teams
    : [...new Set(availableGrants.map((g) => g.dept))];
  const typeOptions = isAdmin
    ? docTypes
    : [
        ...new Set(
          availableGrants
            .filter((g) => g.dept === team)
            .map((g) => g.type.toLowerCase()),
        ),
      ];
  return (
    <Screen>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <IconButton
              name="close"
              label="Cancel upload"
              disabled={ingest.isPending}
              onPress={() => router.back()}
            />
          ),
        }}
      />
      <Text size="title">Add a document</Text>
      <Chips
        value={mode}
        onChange={(value) => {
          if (!ingest.isPending) {
            setMode(value);
            setError(null);
          }
        }}
        options={[
          { label: "File", value: "file" },
          { label: "Camera", value: "camera" },
          { label: "Paste", value: "paste" },
        ]}
      />
      {mode === "paste" ? (
        <Field
          label="Document text"
          multiline
          value={text}
          onChangeText={setText}
          editable={!ingest.isPending}
          style={{ minHeight: 180 }}
          placeholder="Paste the original text here…"
        />
      ) : (
        <View style={{ gap: 16 }}>
          <Button
            kind="secondary"
            label={
              mode === "camera"
                ? "Take a photo"
                : source
                  ? "Choose another file"
                  : "Choose a file"
            }
            icon={mode === "camera" ? "camera-outline" : "folder-open-outline"}
            busy={picking}
            disabled={ingest.isPending}
            onPress={() => {
              void (mode === "camera" ? capture() : chooseFile());
            }}
          />
          {source && (
            <Text size="small" tone="secondary">
              {source.filename}
            </Text>
          )}
          {preview ? (
            <Image
              source={{ uri: preview }}
              accessibilityLabel="Selected document preview"
              style={{ height: 200, width: "100%", borderRadius: 16 }}
              contentFit="contain"
            />
          ) : null}
          {source?.type === "text" && (
            <Text numberOfLines={5} tone="secondary">
              {source.content}
            </Text>
          )}
          <Text size="small" tone="secondary">
            PDF, text, JPG or PNG · up to 2.5 MB
          </Text>
        </View>
      )}
      {source?.type === "image" && mode !== "paste" && (
        <Notice message="This photo will be saved as an image record. Automatic text extraction is not available; use Paste for searchable text." />
      )}
      <Field
        label="Title"
        value={title}
        onChangeText={setTitle}
        editable={!ingest.isPending}
        placeholder="A name you’ll recognize"
        maxLength={200}
      />
      <Picker
        label="Team"
        value={team}
        options={teamOptions.map((value) => ({
          label: humanize(value),
          value,
        }))}
        onChange={(value) => {
          setTeam(value);
          if (!isAdmin)
            setType(
              availableGrants
                .find((g) => g.dept === value)
                ?.type.toLowerCase() || "",
            );
        }}
      />
      <Picker
        label="Document type"
        value={type}
        options={typeOptions.map((value) => ({
          label: humanize(value),
          value,
        }))}
        onChange={setType}
      />
      <Picker
        label="Language"
        value={language}
        options={languages.map((value) => ({ label: value, value }))}
        onChange={setLanguage}
      />
      {session?.demo && (
        <Notice message="Sample workspace. You can try the form; uploads need a live account." />
      )}
      {(error || ingest.error) && <ErrorState error={error || ingest.error} />}
      {ingest.isPending && (
        <Notice message="Adding and processing your document. Keep this screen open." />
      )}
      <Button
        label={ingest.isPending ? "Adding document…" : "Add document"}
        icon="add"
        busy={ingest.isPending}
        disabled={picking}
        onPress={() => {
          if (!lock.current) {
            lock.current = true;
            setError(null);
            ingest.mutate();
          }
        }}
      />
    </Screen>
  );
}
