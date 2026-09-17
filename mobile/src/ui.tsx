import { useReducedMotion } from "react-native-reanimated";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type ColorValue,
  type TextProps,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useTheme } from "./theme";
import { useApp } from "./store";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export function Icon({
  name,
  size = 22,
  color,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
}) {
  const { colors } = useTheme();
  return (
    <Ionicons
      name={name}
      size={size}
      color={color || colors.text}
      accessible={false}
    />
  );
}
export function Text({
  tone = "text",
  size = "body",
  style,
  ...props
}: TextProps & {
  tone?: "text" | "secondary" | "accent" | "danger" | "warning";
  size?: "body" | "small" | "label" | "title" | "heading";
}) {
  const { colors } = useTheme();
  return (
    <RNText
      {...props}
      style={[{ color: colors[tone] }, textStyles[size], style]}
    />
  );
}
const textStyles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 25 },
  small: { fontSize: 13, lineHeight: 19 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  title: { fontSize: 32, lineHeight: 39, letterSpacing: -1, fontWeight: "600" },
  heading: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
});
export function Brand({
  size = 32,
  wordmark = false,
}: {
  size?: number;
  wordmark?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        accessibilityLabel="DocSetu"
      >
        <Path d="M5 4h17l9 9v19H5V4Z" fill={colors.accent} />
        <Path
          d="M22 4v9h9M11 18h14M11 23h14M11 28h8"
          stroke={colors.onAccent}
          strokeWidth={1.7}
        />
      </Svg>
      {wordmark && (
        <Text style={{ fontWeight: "600", fontSize: 24, letterSpacing: -0.8 }}>
          DocSetu.
        </Text>
      )}
    </View>
  );
}
export function Button({
  label,
  onPress,
  icon,
  kind = "primary",
  busy,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  kind?: "primary" | "secondary" | "quiet" | "danger";
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const fg =
    kind === "primary"
      ? colors.onAccent
      : kind === "danger"
        ? colors.danger
        : colors.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 52,
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 16,
          borderCurve: "continuous",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          backgroundColor:
            kind === "primary"
              ? colors.accent
              : kind === "secondary"
                ? colors.accentSoft
                : "transparent",
          opacity: disabled ? 0.5 : pressed ? 0.76 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : icon ? (
        <Icon name={icon} color={fg} />
      ) : null}
      <Text style={{ color: fg, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  selected = false,
  disabled = false,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minWidth: 48,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : pressed ? 0.5 : 1,
      })}
    >
      <Icon name={name} color={selected ? colors.accent : colors.secondary} />
    </Pressable>
  );
}
export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text size="label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.secondary}
        selectionColor={colors.accent}
        {...props}
        style={[
          {
            minHeight: 52,
            borderRadius: 16,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            color: colors.text,
            padding: 16,
            fontSize: 16,
            textAlignVertical: props.multiline ? "top" : "center",
          },
          style,
        ]}
      />
    </View>
  );
}
export function Chips({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
    >
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          accessibilityState={{ selected: value === option.value }}
          aria-selected={value === option.value}
          onPress={() => {
            selection();
            onChange(option.value);
          }}
          style={({ pressed }) => ({
            minHeight: 44,
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 8,
            borderCurve: "continuous",
            backgroundColor:
              value === option.value ? colors.accent : colors.muted,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            size="label"
            style={{
              color:
                value === option.value ? colors.onAccent : colors.secondary,
            }}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function Row({
  title,
  subtitle,
  icon,
  onPress,
  trailing,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const content = (
    <>
      {icon && (
        <View style={{ width: 40, alignItems: "center" }}>
          <Icon name={icon} color={colors.accent} />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontWeight: "500" }}>{title}</Text>
        {subtitle ? (
          <Text size="small" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ||
        (onPress && (
          <Icon name="chevron-forward" size={18} color={colors.secondary} />
        ))}
    </>
  );
  const style: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 72,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  };
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        style,
        { backgroundColor: pressed ? colors.muted : "transparent" },
      ]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}
export function Screen({
  children,
  scroll = true,
  safeTop = false,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  safeTop?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: colors.canvas,
        paddingTop: safeTop ? insets.top : 0,
      }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 44 : 0}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            {
              padding: 24,
              gap: 24,
              paddingBottom: Math.max(24, insets.bottom),
            },
            style,
          ]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, style]}>{children}</View>
      )}
    </KeyboardAvoidingView>
  );
}
export function Notice({
  message,
  error = false,
  action,
  onAction,
}: {
  message: string;
  error?: boolean;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole={error ? "alert" : undefined}
      accessibilityLiveRegion="polite"
      style={{
        padding: 16,
        gap: 8,
        borderRadius: 16,
        borderCurve: "continuous",
        backgroundColor: colors.accentSoft,
      }}
    >
      <Text size="small" tone={error ? "danger" : "secondary"}>
        {message}
      </Text>
      {action && onAction && (
        <Button kind="quiet" label={action} onPress={onAction} />
      )}
    </View>
  );
}
export function Empty({
  title,
  message,
  action,
  onAction,
  icon = "document-text-outline",
}: {
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
  icon?: IconName;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: 40, gap: 16, alignItems: "center" }}>
      <View
        style={{
          padding: 20,
          backgroundColor: colors.muted,
          borderRadius: 24,
          borderCurve: "continuous",
        }}
      >
        <Icon name={icon} size={32} color={colors.accent} />
      </View>
      <Text size="heading" style={{ textAlign: "center" }}>
        {title}
      </Text>
      <Text tone="secondary" style={{ textAlign: "center", maxWidth: 280 }}>
        {message}
      </Text>
      {action && onAction && <Button label={action} onPress={onAction} />}
    </View>
  );
}
export function Loading({ label = "Loading…" }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={{ paddingVertical: 40, gap: 16, alignItems: "center" }}
    >
      <ActivityIndicator color={colors.accent} />
      <Text tone="secondary" size="small">
        {label}
      </Text>
    </View>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <Notice
      error
      message={error instanceof Error ? error.message : "Something went wrong."}
      action={retry ? "Try again" : undefined}
      onAction={retry}
    />
  );
}
export function DemoNotice() {
  const demo = useApp((s) => s.session?.demo);
  return demo ? (
    <Text size="small" tone="secondary" style={{ paddingVertical: 8 }}>
      Sample workspace
    </Text>
  ) : null;
}
export function Picker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View>
      <Text size="label">{label}</Text>
      <Row
        title={options.find((o) => o.value === value)?.label || "Choose"}
        onPress={() => setOpen(true)}
        trailing={<Icon name="chevron-down" size={18} />}
      />
      <Modal
        visible={open}
        animationType={reducedMotion ? "none" : "slide"}
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.canvas,
            paddingTop: insets.top,
          }}
        >
          <View
            style={{
              padding: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text size="heading">{label}</Text>
            <IconButton
              name="close"
              label="Close choices"
              onPress={() => setOpen(false)}
            />
          </View>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingBottom: insets.bottom + 24,
            }}
          >
            {options.map((o) => (
              <Row
                key={o.value}
                title={o.label}
                trailing={
                  o.value === value ? (
                    <Icon name="checkmark" color={colors.accent} />
                  ) : (
                    <View />
                  )
                }
                onPress={() => {
                  selection();
                  onChange(o.value);
                  setOpen(false);
                }}
              />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
export function selection() {
  if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
}
export function success() {
  if (Platform.OS !== "web")
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});
}
export function confirm(
  title: string,
  message: string,
  action = "Delete",
): Promise<boolean> {
  if (Platform.OS === "web")
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        {
          text: action,
          style: action === "Delete" ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
