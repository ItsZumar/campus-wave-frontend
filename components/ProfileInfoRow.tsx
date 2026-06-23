import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  icon: string;
  label: string;
  value: string;
}

export function ProfileInfoRow({ icon, label, value }: Props) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Text style={styles.emoji}>{icon}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    },
    iconWrap: {
      width: 34, height: 34, borderRadius: 10,
      backgroundColor: C.bg,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    emoji: { fontSize: 16 },
    label: { flex: 1, fontSize: 14, fontWeight: "600", color: C.textPrimary },
    value: { fontSize: 13, color: C.textSecondary, maxWidth: "45%", textAlign: "right" },
  });
}
