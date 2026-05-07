import { type AppNotification } from "@/store/notifications";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const ICON_MAP: Record<AppNotification["type"], string> = {
  dm:      "💬",
  message: "📣",
  reply:   "↩️",
  system:  "🔔",
};

const ICON_BG_MAP: Record<AppNotification["type"], string> = {
  dm:      "#5C4EE5",
  message: "#0EA5E9",
  reply:   "#10B981",
  system:  "#475569",
};

function timeLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

type Props = {
  notification: AppNotification;
  onPress: () => void;
  onLongPress?: () => void;
};

export function NotifRow({ notification: n, onPress, onLongPress }: Props) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  const icon   = ICON_MAP[n.type]    ?? "🔔";
  const iconBg = ICON_BG_MAP[n.type] ?? C.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.row, n.read && styles.rowRead]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {!n.read && <View style={styles.unreadDot} />}

      <View style={[styles.iconWrap, { backgroundColor: iconBg + "20" }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.contentTop}>
          <Text style={[styles.title, n.read && styles.titleRead]} numberOfLines={1}>
            {n.title}
          </Text>
          <Text style={styles.time}>{timeLabel(n.createdAt)}</Text>
        </View>
        <Text style={[styles.body, n.read && styles.bodyRead]} numberOfLines={2}>
          {n.body}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: C.card,
      gap: 12,
      position: "relative",
    },
    rowRead: { backgroundColor: C.bg },

    unreadDot: {
      position: "absolute",
      left: 6,
      top: 20,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: C.primary,
    },

    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    iconText: { fontSize: 20 },

    content: { flex: 1 },
    contentTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 8,
      marginBottom: 4,
    },
    title: { fontSize: 14, fontWeight: "700", color: C.textPrimary, flex: 1 },
    titleRead: { fontWeight: "500", color: C.textSecondary },
    time: { fontSize: 11, color: C.placeholder, flexShrink: 0, marginTop: 1 },
    body: { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
    bodyRead: { color: C.placeholder },
  });
}
