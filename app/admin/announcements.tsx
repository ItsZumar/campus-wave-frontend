import {
  type Announcement,
  type AnnouncementCategory,
  type CreateAnnouncementPayload,
  useAnnouncementsStore,
} from "@/store/announcements";
import { useAdminStore } from "@/store/admin";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Category meta ────────────────────────────────────────────────────────────

const CATEGORY_META: Record<AnnouncementCategory, { label: string; icon: string; color: string; bg: string }> = {
  Timetable: { label: "Timetable", icon: "📅", color: "#0EA5E9", bg: "#E0F2FE" },
  Exams:     { label: "Exam Alert", icon: "📝", color: "#F59E0B", bg: "#FEF3C7" },
  Notices:   { label: "Notice",     icon: "📢", color: "#EF4444", bg: "#FEE2E2" },
  Holiday:   { label: "Holiday",    icon: "🏖️", color: "#10B981", bg: "#D1FAE5" },
  Emergency: { label: "Emergency",  icon: "🚨", color: "#DC2626", bg: "#FEE2E2" },
  Event:     { label: "Event",      icon: "🎉", color: "#8B5CF6", bg: "#EDE9FE" },
};

const ALL_CATEGORIES: AnnouncementCategory[] = [
  "Holiday", "Emergency", "Event", "Notices", "Timetable", "Exams",
];

type FilterKey = "All" | AnnouncementCategory | "campus" | "department";

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

type CreateModalProps = {
  visible: boolean;
  onClose: () => void;
  departments: string[];
  C: typeof ColorPalette;
  styles: ReturnType<typeof makeStyles>;
};

function CreateModal({ visible, onClose, departments, C, styles }: CreateModalProps) {
  const { create } = useAnnouncementsStore();
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("Notices");
  const [scope, setScope]       = useState<"campus" | "department">("campus");
  const [dept, setDept]         = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  function reset() {
    setTitle(""); setBody(""); setCategory("Notices");
    setScope("campus"); setDept(""); setError(null);
  }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit() {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!body.trim())  { setError("Body is required."); return; }
    if (scope === "department" && !dept) { setError("Select a department."); return; }
    setError(null);
    setSaving(true);
    const payload: CreateAnnouncementPayload = {
      title: title.trim(), body: body.trim(), category, scope,
      ...(scope === "department" ? { department: dept } : {}),
    };
    try {
      await create(payload);
      handleClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to post.");
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
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Announcement</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={saving || !title.trim() || !body.trim()}>
              {saving
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Text style={[styles.modalPost, (!title.trim() || !body.trim()) && styles.modalPostDisabled]}>Post</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Audience */}
            <Text style={styles.fieldLabel}>Audience</Text>
            <View style={styles.scopeRow}>
              {(["campus", "department"] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.scopeBtn, scope === s && styles.scopeBtnActive]}
                  onPress={() => setScope(s)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.scopeBtnIcon}>{s === "campus" ? "🌐" : "🏛️"}</Text>
                  <Text style={[styles.scopeBtnText, scope === s && styles.scopeBtnTextActive]}>
                    {s === "campus" ? "Campus-wide" : "Department"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Department picker (dept scope only) */}
            {scope === "department" && (
              <>
                <Text style={styles.fieldLabel}>Department</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: "row", gap: 8, paddingVertical: 2 }}>
                    {departments.map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.deptChip, dept === d && styles.deptChipActive]}
                        onPress={() => setDept(d)}
                      >
                        <Text style={[styles.deptChipText, dept === d && styles.deptChipTextActive]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            {/* Category */}
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.catGrid}>
              {ALL_CATEGORIES.map((cat) => {
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
              placeholder="e.g. Eid Holiday — Campus Closed"
              placeholderTextColor={C.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />

            {/* Body */}
            <Text style={styles.fieldLabel}>Message *</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldMulti]}
              placeholder="Write your announcement here…"
              placeholderTextColor={C.textSecondary}
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={2000}
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

// ─── Announcement Row ─────────────────────────────────────────────────────────

function AnnouncementRow({
  item,
  onPin,
  onDelete,
  styles,
}: {
  item: Announcement;
  onPin: () => void;
  onDelete: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const meta = CATEGORY_META[item.category] ?? CATEGORY_META.Notices;
  return (
    <View style={[styles.card, item.pinned && styles.cardPinned]}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            <View style={[styles.badge, { backgroundColor: meta.bg }]}>
              <Text style={styles.badgeIcon}>{meta.icon}</Text>
              <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
            {item.scope === "campus" ? (
              <View style={[styles.badge, { backgroundColor: "#F0EEFF" }]}>
                <Text style={styles.badgeIcon}>🌐</Text>
                <Text style={[styles.badgeText, { color: "#6366F1" }]}>Campus-wide</Text>
              </View>
            ) : (
              <View style={[styles.badge, { backgroundColor: "#F1F5F9" }]}>
                <Text style={styles.badgeIcon}>🏛️</Text>
                <Text style={[styles.badgeText, { color: "#64748B" }]}>{item.department}</Text>
              </View>
            )}
            {item.pinned && (
              <View style={[styles.badge, { backgroundColor: "#F0EEFF" }]}>
                <Text style={styles.badgeIcon}>📌</Text>
                <Text style={[styles.badgeText, { color: "#6366F1" }]}>Pinned</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMeta}>
            {item.author.fullName} · {timeLabel(item.createdAt)}
          </Text>
        </View>
      </View>

      <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onPin}>
          <Text style={styles.actionBtnText}>{item.pinned ? "📌 Unpin" : "📌 Pin"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={onDelete}>
          <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>🗑 Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminAnnouncementsScreen() {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  const { allAnnouncements, loadingAll, fetchAll, togglePin, remove } = useAnnouncementsStore();
  const { departments, fetchDepartments } = useAdminStore();
  const { token } = useAuthStore();

  const [filter, setFilter] = useState<FilterKey>("All");
  const [createVisible, setCreateVisible] = useState(false);

  useEffect(() => {
    fetchAll();
    if (departments.length === 0 && token) fetchDepartments(token);
  }, []);

  const deptNames = useMemo(() => departments.map((d) => d.name), [departments]);

  const filtered = useMemo(() => {
    if (filter === "All") return allAnnouncements;
    if (filter === "campus" || filter === "department")
      return allAnnouncements.filter((a) => a.scope === filter);
    return allAnnouncements.filter((a) => a.category === filter);
  }, [allAnnouncements, filter]);

  const confirmDelete = (id: string, title: string) => {
    Alert.alert("Delete Announcement", `Delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove(id) },
    ]);
  };

  const FILTER_TABS: { key: FilterKey; label: string; icon: string }[] = [
    { key: "All",       label: "All",         icon: "📋" },
    { key: "campus",    label: "Campus-wide",  icon: "🌐" },
    { key: "department",label: "Dept",         icon: "🏛️" },
    { key: "Holiday",   label: "Holiday",      icon: "🏖️" },
    { key: "Emergency", label: "Emergency",    icon: "🚨" },
    { key: "Event",     label: "Event",        icon: "🎉" },
    { key: "Notices",   label: "Notice",       icon: "📢" },
    { key: "Timetable", label: "Timetable",    icon: "📅" },
    { key: "Exams",     label: "Exams",        icon: "📝" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setCreateVisible(true)}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_TABS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={styles.filterChipIcon}>{f.icon}</Text>
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loadingAll && allAnnouncements.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loadingAll} onRefresh={fetchAll} tintColor={C.primary} />}
        >
          <Text style={styles.countLabel}>
            {filtered.length} announcement{filtered.length !== 1 ? "s" : ""}
          </Text>

          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>No announcements</Text>
              <Text style={styles.emptySub}>Tap "+ New" to post the first one.</Text>
            </View>
          )}

          {filtered.map((item) => (
            <AnnouncementRow
              key={item._id}
              item={item}
              onPin={() => togglePin(item._id)}
              onDelete={() => confirmDelete(item._id, item.title)}
              styles={styles}
            />
          ))}
        </ScrollView>
      )}

      <CreateModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        departments={deptNames}
        C={C}
        styles={styles}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: C.bg },
    scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },

    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
      backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    backBtn:     { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    backIcon:    { fontSize: 22, color: C.primary, fontWeight: "700" },
    headerTitle: { fontSize: 18, fontWeight: "800", color: C.textPrimary },
    addBtn:      { backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    addBtnText:  { fontSize: 13, fontWeight: "700", color: "#fff" },

    filterBar:    { borderBottomWidth: 1, borderBottomColor: C.border },
    filterScroll: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
    filterChip:   { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
    filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    filterChipIcon:   { fontSize: 12 },
    filterChipText:   { fontSize: 12, fontWeight: "600", color: C.textSecondary },
    filterChipTextActive: { color: "#fff" },

    countLabel: { fontSize: 12, fontWeight: "700", color: C.textSecondary, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 },

    empty:      { alignItems: "center", paddingTop: 60, gap: 8 },
    emptyEmoji: { fontSize: 48 },
    emptyText:  { fontSize: 17, fontWeight: "700", color: C.textPrimary },
    emptySub:   { fontSize: 13, color: C.textSecondary },

    // Card
    card: {
      backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 10,
      borderWidth: 1, borderColor: C.border, gap: 8,
      shadowColor: "#1E1060", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    cardPinned:  { borderLeftWidth: 3, borderLeftColor: "#6366F1" },
    cardTop:     { flexDirection: "row", gap: 10 },
    cardTitle:   { fontSize: 15, fontWeight: "700", color: C.textPrimary },
    cardMeta:    { fontSize: 12, color: C.textSecondary },
    cardBody:    { fontSize: 13, color: C.textSecondary, lineHeight: 19 },
    cardActions: { flexDirection: "row", gap: 8 },
    actionBtn:   { flex: 1, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: C.primary, alignItems: "center" },
    actionBtnDanger: { borderColor: "#EF4444" },
    actionBtnText:   { fontSize: 13, fontWeight: "600", color: C.primary },
    actionBtnTextDanger: { color: "#EF4444" },

    badge:     { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    badgeIcon: { fontSize: 11 },
    badgeText: { fontSize: 11, fontWeight: "700" },

    // Modal
    modalSafe:   { flex: 1, backgroundColor: C.bg },
    modalHeader: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    modalTitle:        { fontSize: 16, fontWeight: "700", color: C.textPrimary },
    modalCancel:       { fontSize: 15, color: C.textSecondary, fontWeight: "500" },
    modalPost:         { fontSize: 15, color: C.primary, fontWeight: "700" },
    modalPostDisabled: { opacity: 0.4 },
    modalBody:         { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

    fieldLabel: { fontSize: 13, fontWeight: "700", color: C.textSecondary, marginTop: 16, marginBottom: 8, letterSpacing: 0.3 },
    fieldInput: {
      backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
      borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
      fontSize: 15, color: C.textPrimary,
    },
    fieldMulti: { minHeight: 120, textAlignVertical: "top", paddingTop: 12 },

    scopeRow:          { flexDirection: "row", gap: 10, marginBottom: 4 },
    scopeBtn:          { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
    scopeBtnActive:    { backgroundColor: C.primaryLight, borderColor: C.primary },
    scopeBtnIcon:      { fontSize: 18 },
    scopeBtnText:      { fontSize: 14, fontWeight: "600", color: C.textSecondary },
    scopeBtnTextActive:{ color: C.primary },

    deptChip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border },
    deptChipActive:    { backgroundColor: C.primary, borderColor: C.primary },
    deptChipText:      { fontSize: 12, fontWeight: "600", color: C.textSecondary },
    deptChipTextActive:{ color: "#fff" },

    catGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
    catChip:     { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
    catChipIcon: { fontSize: 14 },
    catChipText: { fontSize: 13, fontWeight: "600", color: C.textSecondary },

    errorBanner: { marginTop: 16, padding: 12, backgroundColor: "#FEF2F2", borderRadius: 12, borderWidth: 1, borderColor: "#FECACA" },
    errorText:   { fontSize: 13, color: "#B91C1C", textAlign: "center" },
  });
}
