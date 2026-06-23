import { useAdminStore, type AdminCourse, type AdminUser } from "@/store/admin";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { BASE_URL } from "@/services/api";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

// ─── Teacher Picker Sheet ─────────────────────────────────────────────────────

type TeacherPickerProps = {
  visible: boolean;
  token: string;
  selected: string;
  onSelect: (teacher: AdminUser) => void;
  onClose: () => void;
  C: typeof ColorPalette;
  styles: ReturnType<typeof makeStyles>;
};

function TeacherPickerSheet({ visible, token, selected, onSelect, onClose, C, styles }: TeacherPickerProps) {
  const [teachers, setTeachers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSearch("");
    setLoading(true);
    fetch(`${BASE_URL}/admin/users?role=teacher`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setTeachers(d.users ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible]);

  const filtered = useMemo(() => {
    if (!search.trim()) return teachers;
    const q = search.toLowerCase();
    return teachers.filter(
      (t) => t.fullName.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
    );
  }, [teachers, search]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { maxHeight: "70%" }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Select Teacher</Text>
          <TextInput
            style={[styles.input, { marginBottom: 8 }]}
            placeholder="Search teachers…"
            placeholderTextColor={C.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {loading ? (
            <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {filtered.length === 0 && (
                <Text style={[styles.fieldLabel, { textAlign: "center", paddingVertical: 20 }]}>
                  No teachers found
                </Text>
              )}
              {filtered.map((t) => (
                <TouchableOpacity
                  key={t._id}
                  style={[styles.teacherRow, t._id === selected && styles.teacherRowSelected]}
                  onPress={() => { onSelect(t); onClose(); }}
                >
                  <View style={styles.teacherAvatar}>
                    <Text style={styles.teacherAvatarText}>{t.fullName[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teacherName}>{t.fullName}</Text>
                    <Text style={styles.teacherEmail}>{t.email}</Text>
                  </View>
                  {t._id === selected && <Text style={{ color: C.primary, fontSize: 18 }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Course Form Modal ────────────────────────────────────────────────────────

type FormModalProps = {
  visible: boolean;
  editing: AdminCourse | null;
  token: string;
  departments: string[];
  onClose: () => void;
  onSave: (data: {
    title: string; code: string; description: string;
    department: string; semester: string; teacher: string;
  }) => Promise<void>;
  C: typeof ColorPalette;
  styles: ReturnType<typeof makeStyles>;
};

function CourseFormModal({ visible, editing, token, departments, onClose, onSave, C, styles }: FormModalProps) {
  const [title, setTitle]       = useState("");
  const [code, setCode]         = useState("");
  const [description, setDesc]  = useState("");
  const [department, setDept]   = useState("");
  const [semester, setSemester] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [saving, setSaving]     = useState(false);
  const [teacherPicker, setTeacherPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(editing?.title ?? "");
      setCode(editing?.code ?? "");
      setDesc(editing?.description ?? "");
      setDept(editing?.department ?? "");
      setSemester(editing?.semester ?? "");
      setTeacherId(editing?.teacher?._id ?? "");
      setTeacherName(editing?.teacher?.fullName ?? "");
    }
  }, [visible, editing]);

  const canSave = title.trim() && code.trim() && teacherId;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        code: code.trim(),
        description: description.trim(),
        department,
        semester,
        teacher: teacherId,
      });
      onClose();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={[styles.sheet, { maxHeight: "90%" }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{editing ? "Edit Course" : "New Course"}</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Data Structures"
                placeholderTextColor={C.textSecondary}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.fieldLabel}>Course Code *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. CS301"
                placeholderTextColor={C.textSecondary}
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                autoCapitalize="characters"
                maxLength={12}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="Optional course description"
                placeholderTextColor={C.textSecondary}
                value={description}
                onChangeText={setDesc}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={styles.fieldLabel}>Department</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", gap: 8, paddingVertical: 2 }}>
                  {departments.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.chip, department === d && styles.chipActive]}
                      onPress={() => setDept(d)}
                    >
                      <Text style={[styles.chipText, department === d && styles.chipTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.fieldLabel}>Semester</Text>
              <View style={styles.semRow}>
                {SEMESTERS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.semBtn, semester === s && styles.semBtnActive]}
                    onPress={() => setSemester(s)}
                  >
                    <Text style={[styles.semBtnText, semester === s && styles.semBtnTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Teacher *</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerRow]}
                onPress={() => setTeacherPicker(true)}
              >
                <Text style={teacherId ? styles.pickerValue : styles.pickerPlaceholder}>
                  {teacherId ? teacherName : "Tap to select teacher…"}
                </Text>
                <Text style={{ color: C.primary }}>▼</Text>
              </TouchableOpacity>

              <View style={[styles.sheetActions, { marginBottom: 8 }]}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={!canSave || saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editing ? "Save Changes" : "Create"}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <TeacherPickerSheet
        visible={teacherPicker}
        token={token}
        selected={teacherId}
        onSelect={(t) => { setTeacherId(t._id); setTeacherName(t.fullName); }}
        onClose={() => setTeacherPicker(false)}
        C={C}
        styles={styles}
      />
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CoursesScreen() {
  const { token } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  const {
    courses, coursesLoading, fetchCourses,
    createCourse, updateCourse, deleteCourse,
    importCoursesCSV,
    departments, fetchDepartments,
  } = useAdminStore();

  const [search, setSearch]       = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterSem, setFilterSem]   = useState("");
  const [formVisible, setFormVisible] = useState(false);
  const [editTarget, setEditTarget]   = useState<AdminCourse | null>(null);
  const [importing, setImporting]     = useState(false);

  useEffect(() => {
    if (token) {
      fetchCourses(token);
      if (departments.length === 0) fetchDepartments(token);
    }
  }, [token]);

  const deptNames = useMemo(() => departments.map((d) => d.name), [departments]);

  const filtered = useMemo(() => {
    let list = courses;
    if (filterDept) list = list.filter((c) => c.department === filterDept);
    if (filterSem)  list = list.filter((c) => c.semester === filterSem);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.department?.toLowerCase().includes(q) ||
          c.teacher?.fullName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [courses, search, filterDept, filterSem]);

  const openCreate = () => { setEditTarget(null); setFormVisible(true); };
  const openEdit   = (c: AdminCourse) => { setEditTarget(c); setFormVisible(true); };

  const handleDelete = (c: AdminCourse) => {
    Alert.alert(
      "Delete Course",
      `Delete "${c.title} (${c.code})"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            try { if (token) await deleteCourse(token, c._id); }
            catch (e: unknown) { Alert.alert("Error", e instanceof Error ? e.message : "Failed"); }
          },
        },
      ]
    );
  };

  const handleSave = async (data: Parameters<typeof createCourse>[1]) => {
    if (!token) return;
    if (editTarget) await updateCourse(token, editTarget._id, data);
    else            await createCourse(token, data);
  };

  const handleImportCSV = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["text/csv", "text/comma-separated-values", "application/vnd.ms-excel"] });
    if (result.canceled || !result.assets?.[0]) return;
    const { uri, name } = result.assets[0];
    setImporting(true);
    try {
      const res = await importCoursesCSV(token!, uri, name ?? "courses.csv");
      const msg = `Imported: ${res.imported}  ·  Skipped (duplicates): ${res.skipped}${res.errors > 0 ? `\n\nErrors (${res.errors}):\n${res.errorDetails.map((e) => `• ${e.code}: ${e.reason}`).join("\n")}` : ""}`;
      Alert.alert("Import Complete", msg);
    } catch (e: unknown) {
      Alert.alert("Import Failed", e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Courses</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.importBtn} onPress={handleImportCSV} disabled={importing}>
            {importing
              ? <ActivityIndicator size="small" color={C.primary} />
              : <Text style={styles.importBtnText}>⬆ CSV</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search title, code, teacher…"
          placeholderTextColor={C.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 8 }}>
            {/* Dept filter */}
            <TouchableOpacity
              style={[styles.filterChip, !filterDept && styles.filterChipActive]}
              onPress={() => setFilterDept("")}
            >
              <Text style={[styles.filterChipText, !filterDept && styles.filterChipTextActive]}>All Depts</Text>
            </TouchableOpacity>
            {deptNames.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.filterChip, filterDept === d && styles.filterChipActive]}
                onPress={() => setFilterDept(filterDept === d ? "" : d)}
              >
                <Text style={[styles.filterChipText, filterDept === d && styles.filterChipTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Semester filter row */}
      <View style={styles.semFilterBar}>
        <TouchableOpacity
          style={[styles.semFilterBtn, !filterSem && styles.semFilterBtnActive]}
          onPress={() => setFilterSem("")}
        >
          <Text style={[styles.semFilterText, !filterSem && styles.semFilterTextActive]}>All</Text>
        </TouchableOpacity>
        {SEMESTERS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.semFilterBtn, filterSem === s && styles.semFilterBtnActive]}
            onPress={() => setFilterSem(filterSem === s ? "" : s)}
          >
            <Text style={[styles.semFilterText, filterSem === s && styles.semFilterTextActive]}>Sem {s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {coursesLoading && courses.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={coursesLoading}
              onRefresh={() => token && fetchCourses(token)}
              tintColor={C.primary}
            />
          }
        >
          <Text style={styles.sectionLabel}>
            {filtered.length} course{filtered.length !== 1 ? "s" : ""}
          </Text>

          {filtered.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📚</Text>
              <Text style={styles.emptyText}>No courses found</Text>
              {!search && !filterDept && !filterSem && (
                <Text style={styles.emptySub}>Tap "+ New" to create the first one.</Text>
              )}
            </View>
          )}

          {filtered.map((c) => (
            <View key={c._id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.codeWrap}>
                  <Text style={styles.courseCode}>{c.code}</Text>
                </View>
                <View style={styles.courseInfo}>
                  <Text style={styles.courseTitle}>{c.title}</Text>
                  {(c.department || c.semester || c.section) && (
                    <Text style={styles.courseMeta}>
                      {[c.department, c.semester ? `Sem ${c.semester}` : null, c.section]
                        .filter(Boolean).join(" · ")}
                    </Text>
                  )}
                  {c.description ? (
                    <Text style={styles.courseDesc} numberOfLines={1}>{c.description}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.footerItem}>👤 {c.teacher?.fullName ?? "No teacher"}</Text>
                <Text style={styles.footerItem}>
                  🎓 {c.students?.length ?? 0} student{(c.students?.length ?? 0) !== 1 ? "s" : ""}
                </Text>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(c)}>
                  <Text style={styles.actionBtnText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(c)}>
                  <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>🗑 Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <CourseFormModal
        visible={formVisible}
        editing={editTarget}
        token={token ?? ""}
        departments={deptNames}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
        C={C}
        styles={styles}
      />
    </SafeAreaView>
  );
}

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
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    importBtn: {
      borderWidth: 1, borderColor: C.primary, borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 6, minWidth: 64, alignItems: "center",
    },
    importBtnText: { fontSize: 13, fontWeight: "700", color: C.primary },
    addBtn:      { backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    addBtnText:  { fontSize: 13, fontWeight: "700", color: "#fff" },

    searchWrap: {
      flexDirection: "row", alignItems: "center", gap: 10,
      marginHorizontal: 12, marginTop: 10, paddingHorizontal: 14,
      backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
      borderRadius: 14, height: 46,
    },
    searchIcon:  { fontSize: 16 },
    searchInput: { flex: 1, fontSize: 14, color: C.textPrimary },
    clearBtn:    { fontSize: 14, color: C.textSecondary },

    filterBar:    { borderBottomWidth: 1, borderBottomColor: C.border },
    filterChip:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
    filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    filterChipText:   { fontSize: 12, fontWeight: "600", color: C.textSecondary },
    filterChipTextActive: { color: "#fff" },

    semFilterBar: {
      flexDirection: "row", flexWrap: "wrap", gap: 6,
      paddingHorizontal: 12, paddingVertical: 8,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    semFilterBtn:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: C.border },
    semFilterBtnActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
    semFilterText:      { fontSize: 11, fontWeight: "600", color: C.textSecondary },
    semFilterTextActive: { color: C.primary },

    sectionLabel: {
      fontSize: 12, fontWeight: "700", color: C.textSecondary,
      letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10,
    },

    empty:      { alignItems: "center", paddingTop: 60, gap: 8 },
    emptyEmoji: { fontSize: 48 },
    emptyText:  { fontSize: 17, fontWeight: "700", color: C.textPrimary },
    emptySub:   { fontSize: 13, color: C.textSecondary },

    card: {
      backgroundColor: C.card, borderRadius: 16,
      borderWidth: 1, borderColor: C.border,
      marginBottom: 10,
      shadowColor: "#1E1060", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    cardTop:    { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
    codeWrap:   { backgroundColor: C.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, flexShrink: 0 },
    courseCode: { fontSize: 12, fontWeight: "800", color: C.primary, letterSpacing: 0.5 },
    courseInfo: { flex: 1, gap: 3 },
    courseTitle:{ fontSize: 15, fontWeight: "700", color: C.textPrimary },
    courseMeta: { fontSize: 12, color: C.textSecondary },
    courseDesc: { fontSize: 12, color: C.textSecondary, fontStyle: "italic" },

    cardFooter: {
      flexDirection: "row", gap: 16,
      paddingHorizontal: 14, paddingVertical: 10,
      borderTopWidth: 1, borderTopColor: C.border,
    },
    footerItem: { fontSize: 12, color: C.textSecondary, fontWeight: "500" },

    cardActions: {
      flexDirection: "row", gap: 8,
      paddingHorizontal: 14, paddingBottom: 12,
    },
    actionBtn:          { flex: 1, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: C.primary, alignItems: "center" },
    actionBtnDanger:    { borderColor: "#EF4444" },
    actionBtnText:      { fontSize: 13, fontWeight: "600", color: C.primary },
    actionBtnTextDanger:{ color: "#EF4444" },

    // Modal shared
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 16 },
    sheetTitle:  { fontSize: 18, fontWeight: "800", color: C.textPrimary, marginBottom: 20 },
    fieldLabel: {
      fontSize: 12, fontWeight: "700", color: C.textSecondary,
      textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
    },
    input: {
      backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
      fontSize: 15, color: C.textPrimary, marginBottom: 14,
    },
    inputMulti:  { height: 80, paddingTop: 11 },
    pickerRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    pickerValue: { fontSize: 15, color: C.textPrimary, flex: 1 },
    pickerPlaceholder: { fontSize: 15, color: C.textSecondary, flex: 1 },

    chip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
    chipActive:    { backgroundColor: C.primary, borderColor: C.primary },
    chipText:      { fontSize: 12, fontWeight: "600", color: C.textSecondary },
    chipTextActive:{ color: "#fff" },

    semRow:        { flexDirection: "row", gap: 6, marginBottom: 14, flexWrap: "wrap" },
    semBtn:        { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
    semBtnActive:  { backgroundColor: C.primary, borderColor: C.primary },
    semBtnText:    { fontSize: 14, fontWeight: "700", color: C.textSecondary },
    semBtnTextActive: { color: "#fff" },

    sheetActions:    { flexDirection: "row", gap: 10, marginTop: 4 },
    cancelBtn:       { flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: "center" },
    cancelBtnText:   { fontSize: 15, fontWeight: "600", color: C.textSecondary },
    saveBtn:         { flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: C.primary, alignItems: "center" },
    saveBtnDisabled: { opacity: 0.45 },
    saveBtnText:     { fontSize: 15, fontWeight: "700", color: "#fff" },

    // Teacher picker
    teacherRow:         { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    teacherRowSelected: { backgroundColor: C.primaryLight + "40" },
    teacherAvatar:      { width: 38, height: 38, borderRadius: 19, backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    teacherAvatarText:  { fontSize: 16, fontWeight: "800", color: C.primary },
    teacherName:        { fontSize: 14, fontWeight: "700", color: C.textPrimary },
    teacherEmail:       { fontSize: 12, color: C.textSecondary },
  });
}
