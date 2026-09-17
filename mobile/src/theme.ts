import { useColorScheme } from "react-native";
import { useApp } from "./store";
export const light = {
  hero: "#294F43",
  onHero: "#FFFEFA",
  heroMuted: "#CADACE",
  canvas: "#F6F5F0",
  surface: "#FFFEFA",
  muted: "#EEEEE6",
  text: "#252C28",
  secondary: "#687168",
  accent: "#294F43",
  onAccent: "#FFFEFA",
  accentSoft: "#E5EBE1",
  border: "#D7DBD1",
  danger: "#B13C30",
  warning: "#91621A",
};
export const dark: typeof light = {
  hero: "#203E32",
  onHero: "#F2F3EB",
  heroMuted: "#C0D4C4",
  canvas: "#151C18",
  surface: "#1E2822",
  muted: "#29352D",
  text: "#F2F3EB",
  secondary: "#ADB9AE",
  accent: "#ACCEB7",
  onAccent: "#183426",
  accentSoft: "#293E32",
  border: "#3A493E",
  danger: "#FFB4A7",
  warning: "#E7C580",
};
export function useTheme() {
  const preference = useApp((s) => s.theme);
  const system = useColorScheme();
  const isDark =
    preference === "dark" || (preference === "system" && system === "dark");
  return { colors: isDark ? dark : light, isDark };
}
