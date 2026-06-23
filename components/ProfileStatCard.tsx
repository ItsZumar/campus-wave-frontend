import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  label: string;
  value: number;
  icon: string;
  color: string;
  bg: string;
}

export function ProfileStatCard({ label, value, icon, color, bg }: Props) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: color + "30" }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.value, { color }]}>{value.toLocaleString()}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    card: {
      flex: 1, minWidth: "45%",
      borderRadius: 16, borderWidth: 1,
      padding: 14, alignItems: "center", gap: 4,
    },
    icon:  { fontSize: 22, marginBottom: 2 },
    value: { fontSize: 22, fontWeight: "800" },
    label: { fontSize: 11, fontWeight: "600", color: C.textSecondary, textAlign: "center" },
  });
}
