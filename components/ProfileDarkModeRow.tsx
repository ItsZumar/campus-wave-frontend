import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

interface Props {
  compact?: boolean;
}

export function ProfileDarkModeRow({ compact = false }: Props) {
  const { isDark, toggle } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C, compact), [isDark, compact]);

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: "#8B5CF618" }]}>
        <Text style={styles.emoji}>{isDark ? "🌙" : "☀️"}</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.label}>Dark Mode</Text>
        {!compact && <Text style={styles.sub}>{isDark ? "Enabled" : "Disabled"}</Text>}
      </View>
      <Switch
        value={isDark}
        onValueChange={toggle}
        trackColor={{ false: C.border, true: C.primary }}
        thumbColor={C.white}
      />
    </View>
  );
}

function makeStyles(C: typeof ColorPalette, compact: boolean) {
  const iconSize = compact ? 34 : 42;
  const iconRadius = compact ? 10 : 12;
  const hPad = compact ? 16 : 14;

  return StyleSheet.create({
    row: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: hPad, paddingVertical: 14, gap: 12,
    },
    iconWrap: {
      width: iconSize, height: iconSize, borderRadius: iconRadius,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    emoji: { fontSize: compact ? 16 : 19 },
    text:  { flex: 1 },
    label: { fontSize: compact ? 14 : 15, fontWeight: "600", color: C.textPrimary },
    sub:   { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  });
}
