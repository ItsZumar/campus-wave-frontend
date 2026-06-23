import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const THEME_KEY = "campus_wave_theme";

type ThemeState = {
  isDark: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggle: () => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,
  hydrated: false,

  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(THEME_KEY);
      set({ isDark: stored === "dark", hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  toggle: async () => {
    const next = !get().isDark;
    set({ isDark: next });
    try {
      await SecureStore.setItemAsync(THEME_KEY, next ? "dark" : "light");
    } catch {}
  },
}));
