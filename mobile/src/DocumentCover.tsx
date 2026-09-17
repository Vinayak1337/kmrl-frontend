import { View } from "react-native";
import { useTheme } from "./theme";
import { Text } from "./ui";

/** A document's format cue, never a fabricated preview of its contents. */
export function DocumentCover({
  kind = "document",
  large = false,
}: {
  kind?: string;
  large?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessible={false}
      style={{
        width: large ? 72 : 56,
        height: large ? 92 : 64,
        backgroundColor: colors.accentSoft,
        borderRadius: 8,
        borderCurve: "continuous",
        padding: large ? 12 : 8,
        justifyContent: "flex-end",
        gap: 5,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: 14,
          height: 14,
          backgroundColor: colors.canvas,
          borderBottomLeftRadius: 8,
        }}
      />
      <Text
        numberOfLines={1}
        style={{
          fontSize: large ? 10 : 8,
          lineHeight: 12,
          color: colors.accent,
          fontWeight: "700",
          letterSpacing: 0.4,
        }}
      >
        {kind.toUpperCase()}
      </Text>
      {[1, 0.85, 1, 0.65].map((width, i) => (
        <View
          key={i}
          style={{
            height: 1,
            width: `${width * 100}%`,
            backgroundColor: colors.accent,
            opacity: 0.35,
          }}
        />
      ))}
    </View>
  );
}
