import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

export function AuthBrand() {
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
    </View>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    brand: { alignItems: "center", paddingTop: 48, paddingBottom: 10 },
    logoRing: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: C.primaryLight,
      alignItems: "center", justifyContent: "center",
      marginBottom: 14,
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18, shadowRadius: 12, elevation: 6,
    },
    logoInner: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: C.primary,
      alignItems: "center", justifyContent: "center",
    },
    logoText: { fontSize: 20, fontWeight: "800", color: C.white, letterSpacing: 0.5 },
  });
}
