import { type Group } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { useGroupsStore } from "@/store/groups";
import { ColorPalette as C } from "@/styles";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TYPE_COLORS: Record<string, string> = {
  course:       "#5C4EE5",
  class:        "#10B981",
  department:   "#F59E0B",
  semester:     "#3B82F6",
  study:        "#EC4899",
  club:         "#8B5CF6",
  announcement: "#EF4444",
};

const TYPE_BADGE: Record<string, string> = {
  study:        "Study",
  club:         "Club",
  announcement: "Announcement",
};

function initials(name: string): string {
  return name
    .split(/[\s–\-·]+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
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

function metaLine(g: Group): string | null {
  if (g.type === "course" && g.courseId)
    return [g.courseId.code, g.semester ? `Sem ${g.semester}` : ""].filter(Boolean).join(" · ");
  if (g.type === "class")
    return [g.department, g.semester ? `Sem ${g.semester}` : "", g.section].filter(Boolean).join(" · ");
  if (g.type === "department") return g.department ?? null;
  if (g.type === "semester")   return [g.department, g.semester ? `Semester ${g.semester}` : ""].filter(Boolean).join(" · ");
  if (g.type === "announcement") return "Read-only · Announcements";
  return null;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function GroupsScreen() {
  const { token }  = useAuthStore();
  const {
    groups, discoverList,
    loading, refreshing, discoverLoading,
    error, fetch, refresh, fetchDiscover,
  } = useGroupsStore();
  const [tab, setTab] = useState<"mine" | "discover">("mine");

  useEffect(() => {
    if (token) fetch(token);
  }, [token]);

  useEffect(() => {
    if (tab === "discover" && token) fetchDiscover(token);
  }, [tab, token]);

  const onRefresh = () => {
    if (!token) return;
    if (tab === "mine") refresh(token);
    else fetchDiscover(token);
  };

  const autoSections = useMemo(() => {
    const build = (type: Group["type"], title: string) => {
      const list = groups.filter((g) => g.type === type && g.autoEnrolled);
      return list.length ? { title, data: list } : null;
    };
    return [
      build("semester",   "Semester Group"),
      build("course",     "Course Groups"),
      build("class",      "Class Group"),
      build("department", "Department"),
    ].filter(Boolean) as { title: string; data: Group[] }[];
  }, [groups]);

  const manualSections = useMemo(() => {
    const build = (type: Group["type"], title: string) => {
      const list = groups.filter((g) => g.type === type && !g.autoEnrolled);
      return list.length ? { title, data: list } : null;
    };
    return [
      build("study",        "Study Groups"),
      build("club",         "Clubs & Societies"),
      build("announcement", "Announcements"),
    ].filter(Boolean) as { title: string; data: Group[] }[];
  }, [groups]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Groups</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push("/create-group" as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.createBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Sub-tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === "mine" && styles.tabItemActive]}
          onPress={() => setTab("mine")}
        >
          <Text style={[styles.tabText, tab === "mine" && styles.tabTextActive]}>My Groups</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === "discover" && styles.tabItemActive]}
          onPress={() => setTab("discover")}
        >
          <Text style={[styles.tabText, tab === "discover" && styles.tabTextActive]}>Discover</Text>
        </TouchableOpacity>
      </View>

      {/* ── My Groups ─────────────────────────────────────────────────── */}
      {tab === "mine" && (
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={styles.stateText}>Loading your groups…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.stateEmoji}>⚠️</Text>
            <Text style={styles.stateText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scroll, groups.length === 0 && styles.scrollEmpty]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
            }
          >
            {groups.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.stateEmoji}>📚</Text>
                <Text style={styles.emptyTitle}>No groups yet</Text>
                <Text style={styles.emptySubtitle}>
                  Complete your profile setup or discover groups to join.
                </Text>
              </View>
            ) : (
              <>
                {autoSections.length > 0 && (
                  <>
                    <SectionDivider label="AUTO-ENROLLED" />
                    {autoSections.map((s) => (
                      <GroupSection key={s.title} title={s.title} data={s.data} />
                    ))}
                  </>
                )}
                {manualSections.length > 0 && (
                  <>
                    <SectionDivider label="MY COMMUNITIES" />
                    {manualSections.map((s) => (
                      <GroupSection key={s.title} title={s.title} data={s.data} />
                    ))}
                  </>
                )}
              </>
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        )
      )}

      {/* ── Discover ──────────────────────────────────────────────────── */}
      {tab === "discover" && (
        discoverLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={styles.stateText}>Finding groups…</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scroll, discoverList.length === 0 && styles.scrollEmpty]}
            refreshControl={
              <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={C.primary} />
            }
          >
            {discoverList.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.stateEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>Nothing to discover yet</Text>
                <Text style={styles.emptySubtitle}>
                  Be the first — create a study group or club!
                </Text>
              </View>
            ) : (
              <View style={styles.discoverList}>
                {discoverList.map((g) => (
                  <DiscoverCard key={g._id} group={g} token={token!} />
                ))}
              </View>
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        )
      )}
    </SafeAreaView>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────
function SectionDivider({ label }: { label: string }) {
  return (
    <View style={styles.sectionDivider}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionDividerText}>{label}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

// ─── Group section block ──────────────────────────────────────────────────────
function GroupSection({ title, data }: { title: string; data: Group[] }) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionLabelRow}>
        <Text style={styles.sectionLabel}>{title}</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{data.length}</Text>
        </View>
      </View>
      <View style={styles.groupList}>
        {data.map((g, i) => (
          <GroupCard
            key={g._id}
            group={g}
            lastRow={i === data.length - 1}
            onPress={() => router.push(`/chat/${g._id}?name=${encodeURIComponent(g.name)}` as any)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Group card ────────────────────────────────────────────────────────────────
function GroupCard({ group, lastRow, onPress }: { group: Group; lastRow: boolean; onPress: () => void }) {
  const color = TYPE_COLORS[group.type] ?? C.primary;
  const meta  = metaLine(group);

  return (
    <TouchableOpacity
      style={[styles.groupRow, lastRow && styles.noBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.groupAvatar, { backgroundColor: color }]}>
        <Text style={styles.groupAvatarText}>{initials(group.name)}</Text>
      </View>
      <View style={styles.groupBody}>
        <View style={styles.groupTop}>
          <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
          <Text style={styles.groupTime}>{formatTime(group.updatedAt)}</Text>
        </View>
        {group.description ? (
          <Text style={styles.groupDesc} numberOfLines={1}>{group.description}</Text>
        ) : null}
        {meta ? <Text style={styles.groupMeta}>{meta}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Discover card ─────────────────────────────────────────────────────────────
function DiscoverCard({ group, token }: { group: Group; token: string }) {
  const { joinGroup } = useGroupsStore();
  const [joining, setJoining] = useState(false);
  const color = TYPE_COLORS[group.type] ?? C.primary;
  const badge = TYPE_BADGE[group.type] ?? group.type;

  const handleJoin = async () => {
    setJoining(true);
    try {
      await joinGroup(token, group._id);
    } catch {
      // silently ignore
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={styles.discoverCard}>
      <View style={[styles.discoverAvatar, { backgroundColor: color }]}>
        <Text style={styles.discoverAvatarText}>{initials(group.name)}</Text>
      </View>
      <View style={styles.discoverBody}>
        <View style={styles.discoverTop}>
          <Text style={styles.discoverName} numberOfLines={1}>{group.name}</Text>
          <View style={[styles.typeBadge, { backgroundColor: color + "22" }]}>
            <Text style={[styles.typeBadgeText, { color }]}>{badge}</Text>
          </View>
        </View>
        {group.description ? (
          <Text style={styles.discoverDesc} numberOfLines={2}>{group.description}</Text>
        ) : null}
        <View style={styles.discoverFooter}>
          {group.memberCount !== undefined && (
            <Text style={styles.memberCount}>{group.memberCount} members</Text>
          )}
          <TouchableOpacity
            style={[styles.joinBtn, joining && styles.joinBtnDisabled]}
            onPress={handleJoin}
            disabled={joining}
            activeOpacity={0.8}
          >
            {joining
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.joinBtnText}>Join</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  scroll:      { paddingBottom: 16 },
  scrollEmpty: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: C.textPrimary, letterSpacing: -0.3 },
  createBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  createBtnText: { color: "#fff", fontSize: 22, lineHeight: 26, fontWeight: "400" },

  tabBar: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border,
    paddingHorizontal: 16,
  },
  tabItem:       { flex: 1, alignItems: "center", paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabItemActive: { borderBottomColor: C.primary },
  tabText:       { fontSize: 14, fontWeight: "600", color: C.textSecondary },
  tabTextActive: { color: C.primary },

  sectionDivider: {
    flexDirection: "row", alignItems: "center",
    gap: 10, marginHorizontal: 16, marginTop: 20, marginBottom: 4,
  },
  sectionLine:        { flex: 1, height: 1, backgroundColor: C.border },
  sectionDividerText: { fontSize: 11, fontWeight: "700", color: C.placeholder, letterSpacing: 0.8 },

  sectionBlock: { marginBottom: 8 },
  sectionLabelRow: {
    flexDirection: "row", alignItems: "center",
    gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6,
  },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: C.textSecondary, letterSpacing: 0.5, textTransform: "uppercase" },
  countPill:    { backgroundColor: C.border, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  countText:    { fontSize: 11, fontWeight: "700", color: C.textSecondary },

  groupList: {
    backgroundColor: C.card, marginHorizontal: 16,
    borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: "hidden",
    shadowColor: "#1E1060", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  groupRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  noBorder:        { borderBottomWidth: 0 },
  groupAvatar:     { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  groupAvatarText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  groupBody:       { flex: 1, minWidth: 0 },
  groupTop:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  groupName:       { fontSize: 15, fontWeight: "700", color: C.textPrimary, flex: 1, marginRight: 8 },
  groupTime:       { fontSize: 11, color: C.textSecondary, flexShrink: 0 },
  groupDesc:       { fontSize: 12, color: C.textSecondary, marginBottom: 2 },
  groupMeta:       { fontSize: 11, color: C.placeholder },
  chevron:         { fontSize: 20, color: C.placeholder, marginLeft: 4 },

  discoverList: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  discoverCard: {
    flexDirection: "row", backgroundColor: C.card,
    borderRadius: 18, borderWidth: 1, borderColor: C.border,
    padding: 14, gap: 12,
    shadowColor: "#1E1060", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  discoverAvatar:     { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  discoverAvatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  discoverBody:       { flex: 1, minWidth: 0 },
  discoverTop:        { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  discoverName:       { flex: 1, fontSize: 15, fontWeight: "700", color: C.textPrimary },
  typeBadge:          { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText:      { fontSize: 11, fontWeight: "700" },
  discoverDesc:       { fontSize: 13, color: C.textSecondary, lineHeight: 18, marginBottom: 8 },
  discoverFooter:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  memberCount:        { fontSize: 12, color: C.placeholder },
  joinBtn:            { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: C.primary, borderRadius: 12, minWidth: 64, alignItems: "center" },
  joinBtnDisabled:    { opacity: 0.5 },
  joinBtnText:        { color: "#fff", fontSize: 13, fontWeight: "700" },

  center:        { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 32, gap: 10 },
  stateEmoji:    { fontSize: 36 },
  stateText:     { fontSize: 14, color: C.textSecondary, textAlign: "center" },
  emptyTitle:    { fontSize: 16, fontWeight: "700", color: C.textPrimary },
  emptySubtitle: { fontSize: 13, color: C.textSecondary, textAlign: "center", lineHeight: 20 },
  retryBtn:      { marginTop: 4, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: C.primary, borderRadius: 12 },
  retryText:     { color: "#fff", fontWeight: "700", fontSize: 14 },
});
