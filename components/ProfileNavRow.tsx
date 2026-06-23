import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  icon: string;
  iconBg: string;
  label: string;
  sub?: string;
  badge?: number;
  danger?: boolean;
  showChevron?: boolean;
  onPress: () => void;
}

export function ProfileNavRow({
  icon, iconBg, label, sub, badge, danger, showChevron = true, onPress,
}: Props) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Text style={styles.emoji}>{icon}</Text>
      </View>
      <View style={styles.text}>
        <Text style={[styles.label, danger && styles.dangerLabel]}>{label}</Text>
        {sub && <Text style={styles.sub}>{sub}</Text>}
      </View>
      {badge !== undefined && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      {showChevron && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 14, paddingVertical: 14, gap: 12,
    },
    iconWrap: {
      width: 42, height: 42, borderRadius: 12,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    emoji:       { fontSize: 19 },
    text:        { flex: 1 },
    label:       { fontSize: 15, fontWeight: "600", color: C.textPrimary },
    dangerLabel: { color: "#EF4444" },
    sub:         { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    chevron:     { fontSize: 22, color: C.placeholder },
    badge: {
      minWidth: 22, height: 22, borderRadius: 11,
      backgroundColor: "#EF4444",
      alignItems: "center", justifyContent: "center",
      paddingHorizontal: 6,
    },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  });
}
