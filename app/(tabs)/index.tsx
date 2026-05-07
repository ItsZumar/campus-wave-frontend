import { IconSymbol } from "@/components/ui/icon-symbol";
import { type Group } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { useChatUnreadStore } from "@/store/chatUnread";
import { useGroupsStore } from "@/store/groups";
import { useNotificationsStore } from "@/store/notifications";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, RefreshControl, SectionList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────
type ChatItem = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  initials: string;
  color: string;
  profileImage?: string;
};

type ChatSection = {
  title: string;
  data: ChatItem[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string): string {
  return name
    .split(/[\s–\-·]+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function groupColor(type: Group["type"]): string {
  if (type === "department") return "#F59E0B";
  if (type === "class") return "#10B981";
  if (type === "dm") return "#381B7C";
  return "#0EA5E9";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function toItem(g: Group, unreadByGroup: Record<string, number>): ChatItem {
  const displayName = g.type === "dm" ? (g.otherUser?.fullName ?? "Direct Message") : g.name;

  let lastMessage = "No messages yet";
  let time = formatTime(g.updatedAt);

  if (g.lastMessage) {
    const lm = g.lastMessage;
    const senderPrefix = lm.sender?.fullName?.split(" ")[0];
    let preview: string;
    if (lm.text) {
      preview = lm.text;
    } else if (lm.invite?.groupName) {
      preview = `📨 Group Invite: ${lm.invite.groupName}`;
    } else if (lm.attachment) {
      const mime = lm.attachment.mimeType ?? "";
      if (mime.startsWith("image/")) preview = "🖼️ Image";
      else if (mime.startsWith("video/")) preview = "🎥 Video";
      else if (mime.startsWith("audio/")) preview = "🎵 Audio";
      else preview = "📎 Document";
    } else {
      preview = "Sent a message";
    }
    lastMessage = senderPrefix ? `${senderPrefix}: ${preview}` : preview;
    time = formatTime(lm.createdAt);
  }

  return {
    id: g._id,
    name: displayName,
    lastMessage,
    time,
    unread: unreadByGroup[g._id] ?? 0,
    initials: initials(displayName),
    color: groupColor(g.type),
    profileImage: g.type === "dm" ? g.otherUser?.profileImage : undefined,
  };
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRows({ anim, styles }: { anim: Animated.Value; styles: StylesType }) {
  return (
    <>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Animated.View key={i} style={[styles.skeletonRow, { opacity: anim }]}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonBody}>
            <View style={[styles.skeletonLine, { width: i % 2 === 0 ? "55%" : "70%" }]} />
            <View style={[styles.skeletonLine, styles.skeletonLineSm, { width: i % 3 === 0 ? "80%" : "60%" }]} />
          </View>
        </Animated.View>
      ))}
    </>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ChatsScreen() {
  const { token, user } = useAuthStore();
  const { groups, loading, refreshing, error, fetch, refresh } = useGroupsStore();
  const { unreadByGroup } = useChatUnreadStore();
  const { notifications } = useNotificationsStore();
  const notifUnread = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);
  const [query, setQuery] = useState("");
  const { bottom: bottomInset } = useSafeAreaInsets();

  const skelAnim = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(skelAnim, { toValue: 0.85, duration: 850, useNativeDriver: true }),
        Animated.timing(skelAnim, { toValue: 0.35, duration: 850, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const totalUnread = useMemo(() => Object.values(unreadByGroup).reduce((a, b) => a + b, 0), [unreadByGroup]);

  useEffect(() => {
    if (token) fetch(token);
  }, [token]);

  const onRefresh = () => {
    if (token) refresh(token);
  };

  const sections = useMemo<ChatSection[]>(() => {
    const q = query.trim().toLowerCase();
    const matches = (g: Group) =>
      !q ||
      g.name.toLowerCase().includes(q) ||
      (g.description ?? "").toLowerCase().includes(q) ||
      (g.department ?? "").toLowerCase().includes(q) ||
      (g.section ?? "").toLowerCase().includes(q);

    const build = (type: Group["type"], title: string): ChatSection | null => {
      const filtered = groups.filter((g) => g.type === type && (type === "dm" || !g.autoEnrolled) && matches(g));
      if (!filtered.length) return null;
      return { title, data: filtered.map((g) => toItem(g, unreadByGroup)) };
    };

    return [
      build("dm", "Direct Messages"),
      build("class", "Class Groups"),
      build("department", "Department Groups"),
      build("course", "Course Groups"),
    ].filter(Boolean) as ChatSection[];
  }, [groups, query, unreadByGroup]);

  const firstName = user?.fullName?.split(" ")[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Chats</Text>
            {totalUnread > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{totalUnread > 99 ? "99+" : totalUnread}</Text>
              </View>
            )}
          </View>
          {firstName ? <Text style={styles.headerSub}>Hey, {firstName} 👋</Text> : null}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.newBtn} onPress={() => router.push("/notifications" as any)} activeOpacity={0.75}>
            <IconSymbol size={20} name="bell.fill" color={C.primary} />
            {notifUnread > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{notifUnread > 99 ? "99+" : notifUnread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations…"
            placeholderTextColor={C.placeholder}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="never"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.clearBtn}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── States ── */}
      {loading ? (
        <View style={styles.skeletonWrap}>
          <SkeletonRows anim={skelAnim} styles={styles} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <View style={styles.stateIconCircle}>
            <Text style={styles.stateIconText}>⚠️</Text>
          </View>
          <Text style={styles.stateTitle}>Something went wrong</Text>
          <Text style={styles.stateSubtitle}>{error}</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={onRefresh}>
            <Text style={styles.actionBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.stateIconCircle}>
            <Text style={styles.stateIconText}>{query ? "🔍" : "💬"}</Text>
          </View>
          <Text style={styles.stateTitle}>{query ? "No results found" : "No conversations yet"}</Text>
          <Text style={styles.stateSubtitle}>
            {query
              ? `Nothing matched "${query}". Try a different keyword.`
              : "You'll be added to groups automatically once courses are set up."}
          </Text>
          {query.length > 0 && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => setQuery("")}>
              <Text style={styles.actionBtnText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>{section.title}</Text>
              <View style={styles.sectionCount}>
                <Text style={styles.sectionCountText}>{section.data.length}</Text>
              </View>
            </View>
          )}
          renderItem={({ item }) => <ChatRow item={item} styles={styles} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
          showsVerticalScrollIndicator={false}
        />
      )}
      {/* ── FAB ── */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push("/new-dm" as any)} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Chat row ─────────────────────────────────────────────────────────────────
type StylesType = ReturnType<typeof makeStyles>;

function ChatRow({ item, styles }: { item: ChatItem; styles: StylesType }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/chat/${item.id}?name=${encodeURIComponent(item.name)}` as any)}
      activeOpacity={0.7}
    >
      {item.profileImage ? (
        <Image source={{ uri: item.profileImage }} style={styles.avatarImage} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: item.color }]}>
          <Text style={styles.avatarText}>{item.initials}</Text>
        </View>
      )}

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.chatName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.chatTime, item.unread > 0 && styles.chatTimeUnread]}>{item.time}</Text>
        </View>
        <View style={styles.rowBottom}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unread > 99 ? "99+" : item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },

    // ── Header ──
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 14,
      backgroundColor: C.card,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
    headerTitle: { fontSize: 28, fontWeight: "800", color: C.textPrimary, letterSpacing: -0.5 },
    headerBadge: {
      backgroundColor: C.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 5,
    },
    headerBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    headerSub: { fontSize: 12, color: C.textSecondary, fontWeight: "500" },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    newBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: C.border,
    },
    newBtnText: { fontSize: 17 },
    bellBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      backgroundColor: C.primary,
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    bellBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },

    // ── Search ──
    searchWrap: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: C.card,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.bg,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: C.border,
      paddingHorizontal: 12,
      height: 44,
      gap: 8,
    },
    searchIcon: { fontSize: 15 },
    searchInput: { flex: 1, fontSize: 14, color: C.textPrimary },
    clearBtn: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },
    clearIcon: { fontSize: 11, color: C.textSecondary, fontWeight: "700" },

    // ── List ──
    listContent: { paddingBottom: 20 },

    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 8,
    },
    sectionHeader: {
      fontSize: 11,
      fontWeight: "700",
      color: C.textSecondary,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    sectionCount: {
      backgroundColor: C.primaryLight,
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    sectionCountText: { fontSize: 11, fontWeight: "700", color: C.primary },

    sectionGap: { height: 0 },
    separator: { height: 1, backgroundColor: C.border, marginLeft: 76 },

    // ── Chat row (unchanged) ──
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: C.card,
      gap: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    avatarImage: { width: 48, height: 48, borderRadius: 24, flexShrink: 0 },
    avatarText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    rowBody: { flex: 1 },
    rowTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    chatName: { fontSize: 15, fontWeight: "600", color: C.textPrimary, flex: 1, marginRight: 8 },
    chatTime: { fontSize: 12, color: C.textSecondary },
    chatTimeUnread: { color: C.primary, fontWeight: "600" },
    rowBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    lastMessage: { fontSize: 13, color: C.textSecondary, flex: 1, marginRight: 8 },
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 5,
    },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    // ── Skeleton ──
    skeletonWrap: { paddingTop: 8 },
    skeletonRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
      backgroundColor: C.card,
    },
    skeletonAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.border, flexShrink: 0 },
    skeletonBody: { flex: 1, gap: 8 },
    skeletonLine: { height: 13, borderRadius: 6, backgroundColor: C.border },
    skeletonLineSm: { height: 11 },

    // ── Empty / Error states ──
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 36,
      gap: 12,
    },
    stateIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: C.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
      borderWidth: 1,
      borderColor: C.border,
    },
    stateIconText: { fontSize: 36 },
    stateTitle: { fontSize: 17, fontWeight: "700", color: C.textPrimary, textAlign: "center" },
    stateSubtitle: { fontSize: 13, color: C.textSecondary, textAlign: "center", lineHeight: 20 },
    actionBtn: {
      marginTop: 6,
      paddingHorizontal: 28,
      paddingVertical: 11,
      backgroundColor: C.primary,
      borderRadius: 14,
    },
    actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

    // ── FAB ──
    fab: {
      position: "absolute",
      right: 20,
      width: 56,
      bottom: 20,
      height: 56,
      borderRadius: 28,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    fabIcon: { fontSize: 22, color: "#fff", fontWeight: "300" },
  });
}
