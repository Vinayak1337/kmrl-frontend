import { Platform, Linking } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import type { Document } from "./domain";

export function imageMime(content: string) {
  const bytes = content.replace(/^data:[^,]+,/, "");
  if (bytes.startsWith("iVBORw0KGgo")) return "image/png";
  if (bytes.startsWith("R0lGOD")) return "image/gif";
  if (bytes.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

export async function openOriginal(doc: Document) {
  if (doc.raw?.url) {
    const url = new URL(doc.raw.url);
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("This source link cannot be opened.");
    await Linking.openURL(url.toString());
    return;
  }
  const content = doc.raw?.content || doc.raw?.text;
  if (!content)
    throw new Error(
      "The original file is not available. Read the extracted source below.",
    );
  const type = doc.raw?.type || "text";
  const extension =
    type === "pdf"
      ? "pdf"
      : type === "image"
        ? imageMime(content).split("/")[1].replace("jpeg", "jpg")
        : type === "html"
          ? "html"
          : "txt";
  const mimeType =
    type === "pdf"
      ? "application/pdf"
      : type === "image"
        ? imageMime(content)
        : type === "html"
          ? "text/html"
          : "text/plain";
  const name = `${doc.title.replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 80) || "document"}.${extension}`;
  if (Platform.OS === "web") {
    const binary =
      type === "pdf" || type === "image"
        ? Uint8Array.from(atob(content.replace(/^data:[^,]+,/, "")), (c) =>
            c.charCodeAt(0),
          )
        : content;
    const url = URL.createObjectURL(new Blob([binary], { type: mimeType }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is not available on this device.");
  const uri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(
    uri,
    content.replace(/^data:[^,]+,/, ""),
    {
      encoding:
        type === "pdf" || type === "image"
          ? FileSystem.EncodingType.Base64
          : FileSystem.EncodingType.UTF8,
    },
  );
  try {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle: doc.title });
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
}
