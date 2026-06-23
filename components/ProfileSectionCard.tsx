import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  label?: string;
  children: React.ReactNode;
}

export function ProfileSectionCard({ label, children }: Props) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  return (
    <View style={styles.section}>
      {label && <Text style={styles.sectionLabel}>{label}</Text>}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    section:      { paddingHorizontal: 16, paddingTop: 24 },
    sectionLabel: {
      fontSize: 12, fontWeight: "700", color: C.textSecondary,
      letterSpacing: 0.6, textTransform: "uppercase",
      marginBottom: 10, paddingHorizontal: 4,
    },
    card: {
      backgroundColor: C.card,
      borderRadius: 18, borderWidth: 1, borderColor: C.border,
      overflow: "hidden",
      shadowColor: "#1E1060",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    },
  });
}
