import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function AuthHeader() {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  return (
    <View style={styles.brand}>
      <View style={styles.logoRing}>
        <View style={styles.logoInner}>
          <Text style={styles.logoText}>CW</Text>
        </View>
      </View>

      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to your campus account</Text>
    </View>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    brand: {
      alignItems: "center",
      paddingTop: 48,
      marginBottom: 34,
    },

    logoRing: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: C.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },

    logoInner: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    logoText: {
      color: C.white,
      fontSize: 20,
      fontWeight: "800",
    },

    title: {
      fontSize: 22,
      fontWeight: "700",
      color: C.textPrimary,
    },

    subtitle: {
      marginTop: 4,
      color: C.textSecondary,
    },
  });
}
