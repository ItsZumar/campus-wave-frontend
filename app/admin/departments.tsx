import { useAdminStore, type Department } from "@/store/admin";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
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

const DEPT_COLORS = [
  "#6366F1", "#0EA5E9", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#84CC16",
];

// ─── Department Form Modal ────────────────────────────────────────────────────

type FormModalProps = {
  visible: boolean;
  editing: Department | null;
  onClose: () => void;
  onSave: (data: { name: string; code: string; description: string }) => Promise<void>;
  C: typeof ColorPalette;
  styles: ReturnType<typeof makeStyles>;
};

function DepartmentFormModal({ visible, editing, onClose, onSave, C, styles }: FormModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(editing?.name ?? "");
      setCode(editing?.code ?? "");
      setDescription(editing?.description ?? "");
    }
  }, [visible, editing]);

  const canSave = name.trim().length > 0 && code.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), code: code.trim(), description: description.trim() });
      onClose();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{editing ? "Edit Department" : "New Department"}</Text>

          <Text style={styles.fieldLabel}>Department Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Computer Science"
            placeholderTextColor={C.textSecondary}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.fieldLabel}>Code *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. CS"
            placeholderTextColor={C.textSecondary}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={10}
          />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Optional description"
            placeholderTextColor={C.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.sheetActions}>
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DepartmentsScreen() {
  const { token } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  const {
    departments,
    departmentsLoading,
    fetchDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    importDepartmentsCSV,
    users,
    usersLoading,
    fetchUsers,
  } = useAdminStore();

  const [formVisible, setFormVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (token) {
      fetchDepartments(token);
      fetchUsers(token, {});
    }
  }, [token]);

  const deptCounts = useMemo(() => {
    const map: Record<string, { students: number; teachers: number }> = {};
    for (const u of users) {
      if (!u.department) continue;
      if (!map[u.department]) map[u.department] = { students: 0, teachers: 0 };
      if (u.role === "student") map[u.department].students++;
      else if (u.role === "teacher") map[u.department].teachers++;
    }
    return map;
  }, [users]);

  const openCreate = () => {
    setEditTarget(null);
    setFormVisible(true);
  };

  const openEdit = (dept: Department) => {
    setEditTarget(dept);
    setFormVisible(true);
  };

  const handleDelete = (dept: Department) => {
    Alert.alert(
      "Delete Department",
      `Are you sure you want to delete "${dept.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (token) await deleteDepartment(token, dept._id);
            } catch (e: unknown) {
              Alert.alert("Error", e instanceof Error ? e.message : "Failed to delete");
            }
          },
        },
      ]
    );
  };

  const handleSave = async (data: { name: string; code: string; description: string }) => {
    if (!token) return;
    if (editTarget) await updateDepartment(token, editTarget._id, data);
    else            await createDepartment(token, data);
  };

  const handleImportCSV = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["text/csv", "text/comma-separated-values", "application/vnd.ms-excel"] });
    if (result.canceled || !result.assets?.[0]) return;
    const { uri, name } = result.assets[0];
    setImporting(true);
    try {
      const res = await importDepartmentsCSV(token!, uri, name ?? "departments.csv");
      const msg = `Imported: ${res.imported}  ·  Skipped (duplicates): ${res.skipped}${res.errors > 0 ? `\n\nErrors (${res.errors}):\n${res.errorDetails.map((e) => `• ${e.code}: ${e.reason}`).join("\n")}` : ""}`;
      Alert.alert("Import Complete", msg);
    } catch (e: unknown) {
      Alert.alert("Import Failed", e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setImporting(false);
    }
  };

  const loading = departmentsLoading || usersLoading;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Departments</Text>
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

      {loading && departments.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => {
                if (token) {
                  fetchDepartments(token);
                  fetchUsers(token, {});
                }
              }}
              tintColor={C.primary}
            />
          }
        >
          <Text style={styles.sectionLabel}>{departments.length} department{departments.length !== 1 ? "s" : ""}</Text>

          {departments.length === 0 && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🏛️</Text>
              <Text style={styles.emptyText}>No departments yet</Text>
              <Text style={styles.emptySub}>Tap "+ New" to create the first one.</Text>
            </View>
          )}

          {departments.map((dept, i) => {
            const counts = deptCounts[dept.name] ?? { students: 0, teachers: 0 };
            const total  = counts.students + counts.teachers;
            const color  = DEPT_COLORS[i % DEPT_COLORS.length];
            return (
              <View key={dept._id} style={styles.card}>
                <View style={[styles.colorBar, { backgroundColor: color }]} />
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <View style={[styles.iconWrap, { backgroundColor: color + "18" }]}>
                      <Text style={styles.deptEmoji}>🏛️</Text>
                    </View>
                    <View style={styles.deptInfo}>
                      <Text style={styles.deptName}>{dept.name}</Text>
                      <Text style={styles.deptCode}>{dept.code}</Text>
                      {dept.description ? (
                        <Text style={styles.deptDesc} numberOfLines={2}>{dept.description}</Text>
                      ) : null}
                      <Text style={styles.deptMeta}>
                        {counts.students} student{counts.students !== 1 ? "s" : ""}
                        {" · "}
                        {counts.teachers} teacher{counts.teachers !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    <View style={[styles.countBadge, { backgroundColor: color + "18" }]}>
                      <Text style={[styles.countText, { color }]}>{total}</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: color }]}
                      onPress={() => openEdit(dept)}
                    >
                      <Text style={[styles.actionBtnText, { color }]}>✏️ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnDanger]}
                      onPress={() => handleDelete(dept)}
                    >
                      <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>🗑 Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <DepartmentFormModal
        visible={formVisible}
        editing={editTarget}
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

    // Header
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
    addBtn: {
      backgroundColor: C.primary, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 6,
    },
    addBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

    sectionLabel: {
      fontSize: 12, fontWeight: "700", color: C.textSecondary,
      letterSpacing: 0.6, textTransform: "uppercase",
      marginBottom: 10, marginTop: 8,
    },

    // Empty state
    emptyWrap: { alignItems: "center", paddingTop: 60, gap: 8 },
    emptyEmoji: { fontSize: 48 },
    emptyText:  { fontSize: 17, fontWeight: "700", color: C.textPrimary },
    emptySub:   { fontSize: 13, color: C.textSecondary },

    // Card
    card: {
      flexDirection: "row",
      backgroundColor: C.card, borderRadius: 16,
      borderWidth: 1, borderColor: C.border,
      marginBottom: 10, overflow: "hidden",
      shadowColor: "#1E1060", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    colorBar:    { width: 4 },
    cardContent: { flex: 1, padding: 14, gap: 10 },
    cardTop:     { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    iconWrap: {
      width: 44, height: 44, borderRadius: 14,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    deptEmoji: { fontSize: 20 },
    deptInfo:  { flex: 1, gap: 2 },
    deptName:  { fontSize: 15, fontWeight: "700", color: C.textPrimary },
    deptCode:  { fontSize: 12, fontWeight: "600", color: C.primary, textTransform: "uppercase", letterSpacing: 0.5 },
    deptDesc:  { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    deptMeta:  { fontSize: 12, color: C.textSecondary, marginTop: 4 },
    countBadge: {
      width: 40, height: 40, borderRadius: 12,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    countText: { fontSize: 16, fontWeight: "800" },

    // Card actions
    cardActions: { flexDirection: "row", gap: 8 },
    actionBtn: {
      flex: 1, paddingVertical: 7, borderRadius: 10,
      borderWidth: 1, alignItems: "center",
    },
    actionBtnDanger: { borderColor: "#EF4444" },
    actionBtnText:   { fontSize: 13, fontWeight: "600" },
    actionBtnTextDanger: { color: "#EF4444" },

    // Modal sheet
    backdrop: {
      flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
    },
    sheetHandle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: C.border, alignSelf: "center", marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 18, fontWeight: "800", color: C.textPrimary, marginBottom: 20,
    },
    fieldLabel: {
      fontSize: 12, fontWeight: "700", color: C.textSecondary,
      textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
    },
    input: {
      backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
      fontSize: 15, color: C.textPrimary, marginBottom: 14,
    },
    inputMulti: { height: 80, paddingTop: 11 },
    sheetActions: { flexDirection: "row", gap: 10, marginTop: 4 },
    cancelBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 14,
      borderWidth: 1, borderColor: C.border, alignItems: "center",
    },
    cancelBtnText: { fontSize: 15, fontWeight: "600", color: C.textSecondary },
    saveBtn: {
      flex: 1, paddingVertical: 13, borderRadius: 14,
      backgroundColor: C.primary, alignItems: "center",
    },
    saveBtnDisabled: { opacity: 0.45 },
    saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  });
}
