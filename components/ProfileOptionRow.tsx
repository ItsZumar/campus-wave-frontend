import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  icon: string;
  label: string;
  danger?: boolean;
  showChevron?: boolean;
  onPress: () => void;
}

export function ProfileOptionRow({ icon, label, danger, showChevron, onPress }: Props) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconWrap, danger && styles.dangerIconWrap]}>
        <Text style={styles.emoji}>{icon}</Text>
      </View>
      <Text style={[styles.label, danger && styles.dangerLabel]}>{label}</Text>
      {showChevron && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
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
    dangerIconWrap: { backgroundColor: "#FEE2E2" },
    emoji:          { fontSize: 16 },
    label:          { flex: 1, fontSize: 14, fontWeight: "600", color: C.textPrimary },
    dangerLabel:    { color: "#EF4444" },
    chevron:        { fontSize: 20, color: C.placeholder, marginLeft: 2 },
  });
}
