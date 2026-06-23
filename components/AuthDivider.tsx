import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

export function AuthDivider() {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  return (
    <View style={styles.divider}>
      <View style={styles.line} />
      <Text style={styles.label}>or</Text>
      <View style={styles.line} />
    </View>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    divider: { flexDirection: "row", alignItems: "center", gap: 10 },
    line:    { flex: 1, height: 1, backgroundColor: C.border },
    label:   { fontSize: 13, color: C.textSecondary, fontWeight: "500" },
  });
}
