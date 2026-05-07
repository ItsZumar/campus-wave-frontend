import { NotifRow } from "@/components/NotifRow";
import { type AppNotification, useNotificationsStore } from "@/store/notifications";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, SectionList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Section = { title: string; data: AppNotification[] };

function dateSection(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0);
  if (diff === 0) return "Today";
  if (diff === 86_400_000) return "Yesterday";
  return "Older";
}

function buildSections(notifications: AppNotification[]): Section[] {
  const order = ["Today", "Yesterday", "Older"];
  const map = new Map<string, AppNotification[]>();
  for (const n of notifications) {
    const key = dateSection(n.createdAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(n);
  }
  return order.filter((k) => map.has(k)).map((k) => ({ title: k, data: map.get(k)! }));
}

export default function NotificationsScreen() {
  const { notifications, loading, fetch, markRead, markAllRead, remove } = useNotificationsStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  const sections = useMemo(() => buildSections(notifications), [notifications]);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const onRefresh = useCallback(() => {
    fetch();
  }, [fetch]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead} activeOpacity={0.7}>
            <Text style={styles.markAllText}>Mark all</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={loading}
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          renderItem={({ item }) => (
            <NotifRow
              notification={item}
              onPress={() => {
                markRead(item._id);
                if (item.data?.groupId) {
                  router.push(`/chat/${item.data.groupId}?name=${encodeURIComponent(item.data.groupName ?? "Chat")}` as any);
                }
              }}
              onLongPress={() => remove(item._id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySub}>No notifications yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: C.card,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    backBtn: { padding: 4 },
    backIcon: { fontSize: 28, color: C.primary, lineHeight: 32, fontWeight: "300" },
    headerCenter: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { fontSize: 17, fontWeight: "700", color: C.textPrimary },
    badge: {
      backgroundColor: C.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    markAllBtn: {},
    markAllText: { fontSize: 13, fontWeight: "700", color: C.primary },
    headerSpacer: { width: 36 },

    listContent: { paddingBottom: 24 },

    sectionHeader: {
      fontSize: 12,
      fontWeight: "700",
      color: C.textSecondary,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 6,
    },
    sectionGap: { height: 0 },
    separator: { height: 1, backgroundColor: C.border, marginLeft: 76 },

    center: { flex: 1, alignItems: "center", justifyContent: "center" },

    empty: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 80,
      gap: 8,
    },
    emptyIcon: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: C.textPrimary },
    emptySub: { fontSize: 14, color: C.textSecondary },
  });
}
