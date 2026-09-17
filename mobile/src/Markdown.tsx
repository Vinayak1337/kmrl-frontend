import { Linking, ScrollView, Text } from "react-native";
import MarkdownDisplay, {
  renderRules,
  type RenderRules,
} from "react-native-markdown-display";
import { useTheme } from "./theme";
const rules: RenderRules = {
  // Remote images in generated/document text must not trigger background requests.
  image: () => null,
  textgroup: (node, children, _parent, styles) => (
    <Text key={node.key} selectable style={styles.textgroup}>
      {children}
    </Text>
  ),
  table: (node, children, parent, styles) => (
    <ScrollView
      key={node.key}
      horizontal
      contentContainerStyle={{ paddingVertical: 8 }}
    >
      {renderRules.table!(node, children, parent, styles)}
    </ScrollView>
  ),
};
export function Markdown({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <MarkdownDisplay
      rules={rules}
      style={{
        body: { color: colors.text, fontSize: 16, lineHeight: 25 },
        paragraph: { marginTop: 0, marginBottom: 12 },
        heading1: {
          fontSize: 24,
          lineHeight: 32,
          marginBottom: 12,
          fontWeight: "600",
        },
        heading2: {
          fontSize: 20,
          lineHeight: 28,
          marginBottom: 10,
          fontWeight: "600",
        },
        heading3: {
          fontSize: 18,
          lineHeight: 26,
          marginBottom: 8,
          fontWeight: "600",
        },
        link: { color: colors.accent },
        blockquote: {
          borderLeftColor: colors.accent,
          backgroundColor: colors.accentSoft,
        },
        code_inline: { backgroundColor: colors.muted, color: colors.text },
        fence: {
          backgroundColor: colors.muted,
          color: colors.text,
          borderColor: colors.border,
        },
        table: { borderColor: colors.border },
        tr: { borderColor: colors.border },
      }}
      onLinkPress={(url) => {
        if (/^https?:\/\//i.test(url))
          void Linking.openURL(url).catch(() => {});
        return false;
      }}
    >
      {children}
    </MarkdownDisplay>
  );
}
