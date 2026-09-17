import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import type { User } from "./domain";
import { normalizeApiUrl } from "./domain";
import { demoUser } from "./demo";

export type Session = {
  token: string;
  user: User;
  expiresAt: number;
  baseUrl: string;
  demo?: boolean;
};
type Preference = { saved: string[]; done: string[] };
type State = {
  session: Session | null;
  ready: boolean;
  authNotice: string;
  baseUrl: string;
  theme: "system" | "light" | "dark";
  preferences: Preference;
  hydrate: () => Promise<void>;
  signIn: (session: Session) => Promise<void>;
  signOut: (notice?: string) => Promise<void>;
  enterDemo: () => Promise<void>;
  setBaseUrl: (url: string) => Promise<void>;
  setTheme: (theme: State["theme"]) => Promise<void>;
  toggle: (kind: keyof Preference, id: string) => Promise<void>;
};
const SESSION_KEY = "docsetu-session-v1";
const PREF_KEY = "docsetu-preferences-v1";
const blank = (): Preference => ({ saved: [], done: [] });
// Web previews intentionally keep tokens only in memory. Native uses Keychain/Keystore.
const secure = {
  get: () =>
    Platform.OS === "web"
      ? Promise.resolve(null)
      : SecureStore.getItemAsync(SESSION_KEY),
  set: (value: string) =>
    Platform.OS === "web"
      ? Promise.resolve()
      : SecureStore.setItemAsync(SESSION_KEY, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
  remove: () =>
    Platform.OS === "web"
      ? Promise.resolve()
      : SecureStore.deleteItemAsync(SESSION_KEY),
};
const accountKey = (session: Session) =>
  `${PREF_KEY}:${session.baseUrl}:${session.user.sub}`;
async function readPreferences(session: Session): Promise<Preference> {
  try {
    const raw = JSON.parse(
      (await AsyncStorage.getItem(accountKey(session))) || "{}",
    );
    return {
      saved: Array.isArray(raw.saved)
        ? raw.saved.filter((x: unknown) => typeof x === "string")
        : [],
      done: Array.isArray(raw.done)
        ? raw.done.filter((x: unknown) => typeof x === "string")
        : [],
    };
  } catch {
    return blank();
  }
}
export const useApp = create<State>((set, get) => ({
  session: null,
  ready: false,
  authNotice: "",
  preferences: blank(),
  theme: "system",
  baseUrl: process.env.EXPO_PUBLIC_API_URL || "https://trydocsetu.vercel.app",
  hydrate: async () => {
    try {
      const [raw, settings] = await Promise.all([
        secure.get(),
        AsyncStorage.getItem("docsetu-settings"),
      ]);
      if (settings) {
        const s = JSON.parse(settings);
        set({
          theme: ["light", "dark"].includes(s.theme) ? s.theme : "system",
          baseUrl: normalizeApiUrl(s.baseUrl || get().baseUrl, __DEV__),
        });
      }
      if (raw) {
        const session = JSON.parse(raw) as Session;
        if (
          session.expiresAt > Date.now() &&
          session.token &&
          session.user?.sub &&
          session.baseUrl === get().baseUrl
        )
          set({ session, preferences: await readPreferences(session) });
        else await secure.remove();
      }
    } catch {
      set({ authNotice: "Please sign in again." });
    } finally {
      set({ ready: true });
    }
  },
  signIn: async (session) => {
    if (!session.demo) await secure.set(JSON.stringify(session));
    set({
      session,
      preferences: await readPreferences(session),
      authNotice: "",
    });
  },
  signOut: async (notice = "") => {
    // Clear memory first even if the native storage operation fails.
    set({ session: null, preferences: blank(), authNotice: notice });
    await secure.remove();
  },
  enterDemo: async () =>
    get().signIn({
      token: "",
      user: demoUser,
      expiresAt: Number.MAX_SAFE_INTEGER,
      baseUrl: "demo",
      demo: true,
    }),
  setBaseUrl: async (value) => {
    const baseUrl = normalizeApiUrl(value, __DEV__);
    await AsyncStorage.setItem(
      "docsetu-settings",
      JSON.stringify({ baseUrl, theme: get().theme }),
    );
    set({ baseUrl });
  },
  setTheme: async (theme) => {
    await AsyncStorage.setItem(
      "docsetu-settings",
      JSON.stringify({ baseUrl: get().baseUrl, theme }),
    );
    set({ theme });
  },
  toggle: async (kind, id) => {
    const { session, preferences } = get();
    if (!session) return;
    const next = {
      ...preferences,
      [kind]: preferences[kind].includes(id)
        ? preferences[kind].filter((x) => x !== id)
        : [...preferences[kind], id],
    };
    set({ preferences: next });
    try {
      await AsyncStorage.setItem(accountKey(session), JSON.stringify(next));
    } catch (error) {
      if (get().session === session) set({ preferences });
      throw error;
    }
  },
}));
