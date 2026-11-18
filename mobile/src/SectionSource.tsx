import { View } from "react-native";
import { Image } from "expo-image";
import type { Section } from "./domain";
import { Markdown } from "./Markdown";
import { Text } from "./ui";

export function SectionSource({ section }: { section: Section }) {
  const content = section.content || "No text was extracted from this section.";
  const images =
    section.images?.filter(
      (image) =>
        /^image\/(png|jpeg|gif|webp)$/i.test(image.mimeType) &&
        image.base64 &&
        /^[a-z0-9+/]+=*$/i.test(image.base64),
    ) || [];

  return (
    <View style={{ gap: 12 }}>
      {/\n\|\s*:?-{3,}/.test(content) ? (
        <Markdown>{content}</Markdown>
      ) : (
        <Text selectable style={{ lineHeight: 28 }}>
          {content}
        </Text>
      )}
      {images.map((image, index) => (
        <Image
          key={index}
          source={{ uri: `data:${image.mimeType};base64,${image.base64}` }}
          accessibilityLabel={
            image.caption ||
            `Source image ${index + 1}${image.page ? ` on page ${image.page}` : ""}`
          }
          style={{ width: "100%", height: 250 }}
          contentFit="contain"
          cachePolicy="memory"
        />
      ))}
    </View>
  );
}
