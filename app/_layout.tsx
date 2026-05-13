import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";

export const unstable_settings = {
  initialRouteName: "auth/signup",
};

function RootNavigator() {
  const { user, loading, hydrate } = useAuthStore();
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
    hydrateTheme();
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuth        = segments[0] === "auth";
    const inOnboarding  = segments[0] === "onboarding";
    if (!user && !inAuth) {
      router.replace("/auth/login");
    } else if (user && inAuth) {
      if (!user.coursesSetupDone) router.replace("/onboarding/courses");
      else if (user.role === "admin") router.replace("/(tabs)/dashboard");
      else router.replace("/(tabs)");
    } else if (user && !inAuth && !inOnboarding && !user.coursesSetupDone) {
      router.replace("/onboarding/courses");
    }
  }, [user, loading, segments]);

  return (
    <Stack initialRouteName="auth/signup">
      <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/courses" options={{ headerShown: false }} />
      <Stack.Screen name="create-group" options={{ headerShown: false }} />
      <Stack.Screen name="new-dm" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="user-profile/[userId]" options={{ headerShown: false }} />
      <Stack.Screen name="group-members/[groupId]" options={{ headerShown: false }} />
      <Stack.Screen name="shared-media/[groupId]" options={{ headerShown: false }} />
      <Stack.Screen name="admin/departments"   options={{ headerShown: false }} />
      <Stack.Screen name="admin/courses"       options={{ headerShown: false }} />
      <Stack.Screen name="admin/reports"       options={{ headerShown: false }} />
      <Stack.Screen name="admin/settings"      options={{ headerShown: false }} />
      <Stack.Screen name="admin/announcements" options={{ headerShown: false }} />
      <Stack.Screen name="notifications"       options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isDark } = useThemeStore();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <RootNavigator />
      <StatusBar style={isDark ? "light" : "dark"} />
    </ThemeProvider>
  );
}
