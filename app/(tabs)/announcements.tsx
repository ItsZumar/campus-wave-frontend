import { type Announcement, type AnnouncementCategory, useAnnouncementsStore } from "@/store/announcements";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Category config ──────────────────────────────────────────────────────────
type FilterCategory = "All" | AnnouncementCategory;

const CATEGORY_META: Record<AnnouncementCategory, { label: string; icon: string; color: string; bg: string }> = {
  Timetable: { label: "Timetable", icon: "📅", color: "#0EA5E9", bg: "#E0F2FE" },
  Exams:     { label: "Exam Alert", icon: "📝", color: "#F59E0B", bg: "#FEF3C7" },
  Notices:   { label: "Notice",     icon: "📢", color: "#EF4444", bg: "#FEE2E2" },
};

const FILTERS: FilterCategory[] = ["All", "Timetable", "Exams", "Notices"];
const CATEGORIES: AnnouncementCategory[] = ["Timetable", "Exams", "Notices"];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function authorColor(name: string): string {
  const colors = ["#0EA5E9", "#F59E0B", "#EF4444", "#10B981", "#8B5CF6", "#EC4899", "#5C4EE5"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AnnouncementsScreen() {
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);
  const { announcements, loading, fetch, togglePin, remove, markRead } = useAnnouncementsStore();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("All");
  const [modalVisible, setModalVisible] = useState(false);

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  useEffect(() => { fetch(); }, []);

  useFocusEffect(useCallback(() => { markRead(); }, [markRead]));

  const onRefresh = useCallback(() => { fetch(); }, [fetch]);

  const filtered = useMemo(() => {
    const base = activeFilter === "All"
      ? announcements
      : announcements.filter((a) => a.category === activeFilter);
    return [...base.filter((a) => a.pinned), ...base.filter((a) => !a.pinned)];
  }, [announcements, activeFilter]);

  const handleLongPress = useCallback((item: Announcement) => {
    if (!isTeacher || item.author._id !== user?.id) return;
    const pinLabel = item.pinned ? "Unpin" : "Pin";
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", pinLabel, "Delete"], destructiveButtonIndex: 2, cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) togglePin(item._id);
          if (idx === 2) confirmDelete(item._id);
        },
      );
    } else {
      Alert.alert("Announcement", undefined, [
        { text: pinLabel, onPress: () => togglePin(item._id) },
        { text: "Delete", style: "destructive", onPress: () => confirmDelete(item._id) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }, [isTeacher, user, togglePin]);

  function confirmDelete(id: string) {
    Alert.alert("Delete announcement?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove(id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Announcements</Text>
          <Text style={styles.headerSub}>{filtered.length} posts</Text>
        </View>
        {isTeacher && (
          <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, activeFilter === f && styles.chipActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.75}
            >
              {f !== "All" && <Text style={styles.chipIcon}>{CATEGORY_META[f as AnnouncementCategory].icon}</Text>}
              <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Feed */}
      {loading && announcements.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.feed}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={loading}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <AnnouncementCard
              item={item}
              canManage={isTeacher && item.author._id === user?.id}
              onLongPress={() => handleLongPress(item)}
              styles={styles}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No announcements</Text>
              <Text style={styles.emptySub}>
                {isTeacher ? "Tap + to post the first announcement" : "Nothing in this category yet"}
              </Text>
            </View>
          }
        />
      )}

      {/* Create modal (teacher only) */}
      {isTeacher && (
        <CreateModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          styles={styles}
          C={C}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Announcement card ────────────────────────────────────────────────────────
type StylesType = ReturnType<typeof makeStyles>;

function AnnouncementCard({
  item,
  canManage,
  onLongPress,
  styles,
}: {
  item: Announcement;
  canManage: boolean;
  onLongPress: () => void;
  styles: StylesType;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_META[item.category];
  const color = authorColor(item.author.fullName);

  return (
    <TouchableOpacity
      style={[styles.card, item.pinned && styles.cardPinned]}
      onPress={() => setExpanded((v) => !v)}
      onLongPress={canManage ? onLongPress : undefined}
      activeOpacity={0.85}
    >
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={[styles.authorAvatar, { backgroundColor: color + "22" }]}>
          <Text style={[styles.authorInitials, { color }]}>{initials(item.author.fullName)}</Text>
        </View>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{item.author.fullName}</Text>
          <Text style={styles.authorRole}>{item.author.department ?? item.author.role}</Text>
        </View>
        <View style={styles.timeCol}>
          {item.pinned && <Text style={styles.pinnedLabel}>📌 Pinned</Text>}
          <Text style={styles.timeText}>{timeLabel(item.createdAt)}</Text>
        </View>
      </View>

      {/* Category badge */}
      <View style={[styles.categoryBadge, { backgroundColor: meta.bg }]}>
        <Text style={styles.categoryIcon}>{meta.icon}</Text>
        <Text style={[styles.categoryLabel, { color: meta.color }]}>{meta.label}</Text>
      </View>

      {/* Title */}
      <Text style={styles.cardTitle}>{item.title}</Text>

      {/* Body */}
      <Text style={styles.cardBody} numberOfLines={expanded ? undefined : 2}>
        {item.body}
      </Text>

      <Text style={styles.expandToggle}>{expanded ? "Show less ▲" : "Read more ▼"}</Text>
    </TouchableOpacity>
  );
}

// ─── Create modal (teacher only) ─────────────────────────────────────────────
function CreateModal({ visible, onClose, styles, C }: { visible: boolean; onClose: () => void; styles: StylesType; C: typeof ColorPalette }) {
  const { create } = useAnnouncementsStore();
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("Notices");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  function reset() {
    setTitle(""); setBody(""); setCategory("Notices"); setError(null);
  }

  function handleClose() {
    reset(); onClose();
  }

  async function handleSubmit() {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!body.trim())  { setError("Body is required."); return; }
    setError(null);
    setSaving(true);
    try {
      await create({ title: title.trim(), body: body.trim(), category });
      handleClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to post announcement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <SafeAreaView style={styles.modalSafe} edges={["top", "bottom"]}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Announcement</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving || !title.trim() || !body.trim()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {saving
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Text style={[styles.modalPost, (!title.trim() || !body.trim()) && styles.modalPostDisabled]}>Post</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* Category */}
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const active = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, active && { backgroundColor: meta.bg, borderColor: meta.color }]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.catChipIcon}>{meta.icon}</Text>
                    <Text style={[styles.catChipText, active && { color: meta.color }]}>{meta.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Title */}
            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Mid-Term Exam Schedule"
              placeholderTextColor={C.placeholder}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
              returnKeyType="next"
            />

            {/* Body */}
            <Text style={styles.fieldLabel}>Message *</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldMulti]}
              placeholder="Write your announcement here…"
              placeholderTextColor={C.placeholder}
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={2000}
              returnKeyType="done"
              textAlignVertical="top"
            />

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLeft: { flex: 1 },
  headerTitle:  { fontSize: 26, fontWeight: "800", color: C.textPrimary, letterSpacing: -0.3 },
  headerSub:    { fontSize: 13, color: C.textSecondary, marginTop: 2 },

  fab: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: "#fff", fontSize: 22, lineHeight: 26, fontWeight: "300" },

  filterWrap:   { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
  },
  chipActive:     { backgroundColor: C.primaryLight, borderColor: C.primary },
  chipIcon:       { fontSize: 13 },
  chipText:       { fontSize: 13, fontWeight: "600", color: C.textSecondary },
  chipTextActive: { color: C.primary },

  feed:      { padding: 16, paddingBottom: 32 },
  separator: { height: 12 },
  center:    { flex: 1, alignItems: "center", justifyContent: "center" },

  card: {
    backgroundColor: C.card, borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: C.border,
    shadowColor: "#1E1060", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, gap: 10,
  },
  cardPinned: {
    backgroundColor: "#F0EEFF", borderColor: C.border,
    borderLeftWidth: 3, borderLeftColor: C.primary,
  },

  cardHeader:     { flexDirection: "row", alignItems: "center", gap: 10 },
  authorAvatar:   { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  authorInitials: { fontSize: 14, fontWeight: "800" },
  authorInfo:     { flex: 1 },
  authorName:     { fontSize: 13, fontWeight: "700", color: C.textPrimary },
  authorRole:     { fontSize: 11, color: C.textSecondary, marginTop: 1 },
  timeCol:        { alignItems: "flex-end" },
  pinnedLabel:    { fontSize: 10, fontWeight: "700", color: C.primary, marginBottom: 4 },
  timeText:       { fontSize: 11, color: C.textSecondary, fontWeight: "600" },

  categoryBadge: {
    flexDirection: "row", alignSelf: "flex-start", alignItems: "center",
    gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  categoryIcon:  { fontSize: 11 },
  categoryLabel: { fontSize: 11, fontWeight: "700" },

  cardTitle:    { fontSize: 15, fontWeight: "700", color: C.textPrimary, lineHeight: 22 },
  cardBody:     { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
  expandToggle: { fontSize: 12, fontWeight: "700", color: C.primary, marginTop: -4 },

  empty:      { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyIcon:  { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.textPrimary },
  emptySub:   { fontSize: 14, color: C.textSecondary, textAlign: "center" },

  // Modal
  modalSafe:    { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle:        { fontSize: 16, fontWeight: "700", color: C.textPrimary },
  modalCancel:       { fontSize: 15, color: C.textSecondary, fontWeight: "500" },
  modalPost:         { fontSize: 15, color: C.primary, fontWeight: "700" },
  modalPostDisabled: { opacity: 0.4 },
  modalContent:      { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

  fieldLabel: { fontSize: 13, fontWeight: "700", color: C.textSecondary, marginTop: 20, marginBottom: 8, letterSpacing: 0.3 },
  fieldInput: {
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: C.textPrimary,
  },
  fieldMulti: { minHeight: 120, textAlignVertical: "top", paddingTop: 12 },

  categoryRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
  },
  catChipIcon: { fontSize: 14 },
  catChipText: { fontSize: 13, fontWeight: "600", color: C.textSecondary },

  errorBanner: {
    marginTop: 16, padding: 12,
    backgroundColor: "#FEF2F2", borderRadius: 12,
    borderWidth: 1, borderColor: "#FECACA",
  },
  errorText: { fontSize: 13, color: "#B91C1C", textAlign: "center" },
  });
}
