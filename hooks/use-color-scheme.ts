import { useThemeStore } from "@/store/theme";

export function useColorScheme(): "light" | "dark" {
  const isDark = useThemeStore((s) => s.isDark);
  return isDark ? "dark" : "light";
}
