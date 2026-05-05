import { type Group } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { useGroupsStore } from "@/store/groups";
import { ColorPalette as C } from "@/styles";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  if (type === "class")      return "#10B981";
  if (type === "dm")         return "#8B5CF6";
  return "#0EA5E9";
}

function formatTime(iso: string): string {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function toItem(g: Group): ChatItem {
  const displayName = g.type === "dm"
    ? (g.otherUser?.fullName ?? "Direct Message")
    : g.name;

  let lastMessage = "No messages yet";
  let time = formatTime(g.updatedAt);

  if (g.lastMessage) {
    const lm = g.lastMessage;
    const senderPrefix = lm.sender?.fullName?.split(" ")[0];
    if (lm.text) {
      lastMessage = senderPrefix ? `${senderPrefix}: ${lm.text}` : lm.text;
    } else if (lm.attachment?.name) {
      lastMessage = senderPrefix ? `${senderPrefix}: 📎 ${lm.attachment.name}` : `📎 ${lm.attachment.name}`;
    }
    time = formatTime(lm.createdAt);
  }

  return {
    id:           g._id,
    name:         displayName,
    lastMessage,
    time,
    unread:       0,
    initials:     initials(displayName),
    color:        groupColor(g.type),
    profileImage: g.type === "dm" ? g.otherUser?.profileImage : undefined,
  };
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ChatsScreen() {
  const { token }                              = useAuthStore();
  const { groups, loading, refreshing, error, fetch, refresh } = useGroupsStore();
  const [query, setQuery]                      = useState("");

  useEffect(() => {
    if (token) fetch(token);
  }, [token]);

  const onRefresh = () => { if (token) refresh(token); };

  const sections = useMemo<ChatSection[]>(() => {
    const q = query.trim().toLowerCase();
    const matches = (g: Group) =>
      !q ||
      g.name.toLowerCase().includes(q) ||
      (g.description ?? "").toLowerCase().includes(q) ||
      (g.department ?? "").toLowerCase().includes(q) ||
      (g.section ?? "").toLowerCase().includes(q);

    const build = (type: Group["type"], title: string): ChatSection | null => {
      const filtered = groups.filter(
        (g) => g.type === type && (type === "dm" || !g.autoEnrolled) && matches(g)
      );
      if (!filtered.length) return null;
      return { title, data: filtered.map(toItem) };
    };

    return [
      build("dm",         "Direct Messages"),
      build("class",      "Class Groups"),
      build("department", "Department Groups"),
      build("course",     "Course Groups"),
    ].filter(Boolean) as ChatSection[];
  }, [groups, query]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push("/new-dm" as any)}>
          <Text style={styles.newBtnText}>✏️</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups…"
            placeholderTextColor={C.placeholder}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="never"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* States */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.stateText}>Loading your groups…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>
            {query ? "No results" : "No groups yet"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {query
              ? `Nothing matched "${query}". Try a different keyword.`
              : "You'll be added to groups automatically once courses are set up."}
          </Text>
          {query.length > 0 && (
            <TouchableOpacity style={styles.retryBtn} onPress={() => setQuery("")}>
              <Text style={styles.retryText}>Clear search</Text>
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => <ChatRow item={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Chat row ─────────────────────────────────────────────────────────────────
function ChatRow({ item }: { item: ChatItem }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() =>
        router.push(`/chat/${item.id}?name=${encodeURIComponent(item.name)}` as any)
      }
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
          <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.chatTime, item.unread > 0 && styles.chatTimeUnread]}>
            {item.time}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
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
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: C.card,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: C.textPrimary, letterSpacing: -0.3 },
  newBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.primaryLight,
    alignItems: "center", justifyContent: "center",
  },
  newBtnText: { fontSize: 16 },

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
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: C.textPrimary },
  clearIcon:   { fontSize: 13, color: C.textSecondary, paddingHorizontal: 2 },

  listContent: { paddingBottom: 16 },

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
  separator: {
    height: 1,
    backgroundColor: C.border,
    marginLeft: 76,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    gap: 12,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  avatarImage: {
    width: 48, height: 48, borderRadius: 24,
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  rowBody: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  chatName: {
    fontSize: 15, fontWeight: "600",
    color: C.textPrimary,
    flex: 1, marginRight: 8,
  },
  chatTime:       { fontSize: 12, color: C.textSecondary },
  chatTimeUnread: { color: C.primary, fontWeight: "600" },

  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastMessage: {
    fontSize: 13, color: C.textSecondary,
    flex: 1, marginRight: 8,
  },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 60, paddingHorizontal: 32, gap: 10,
  },
  stateText:    { fontSize: 14, color: C.textSecondary, textAlign: "center" },
  errorEmoji:   { fontSize: 36 },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: C.primary, borderRadius: 12,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  emptyEmoji:    { fontSize: 40 },
  emptyTitle:    { fontSize: 16, fontWeight: "700", color: C.textPrimary },
  emptySubtitle: { fontSize: 13, color: C.textSecondary, textAlign: "center", lineHeight: 20 },
});
