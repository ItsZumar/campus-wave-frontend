import { useAuthStore } from "@/store/auth";
import { type Course, useCoursesStore } from "@/store/courses";
import { ColorPalette as C } from "@/styles";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CourseSelectionScreen() {
  const { user, token, markSetupDone } = useAuthStore();
  const { courses, loading, error, fetchCourses, enrollBulk } = useCoursesStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (token && user?.department && user?.semester) {
      fetchCourses(token, user.department, user.semester);
    }
  }, [token]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleConfirm = async (skip = false) => {
    setSaveError(null);
    setSaving(true);
    try {
      await enrollBulk(token!, skip ? [] : Array.from(selected));
      await markSetupDone();
      router.replace("/(tabs)");
    } catch (err: any) {
      setSaveError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Pick Your Courses</Text>
        <Text style={styles.subtitle}>
          {user?.department} · Semester {user?.semester}
        </Text>
      </View>

      {/* Info banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerIcon}>✦</Text>
        <Text style={styles.bannerText}>
          Select the courses you're enrolled in this semester. You'll be added to their group chats.
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.stateText}>Loading courses…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.stateEmoji}>⚠️</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => token && user?.department && user?.semester
              ? fetchCourses(token, user.department, user.semester)
              : undefined
            }
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.stateEmoji}>📚</Text>
          <Text style={styles.emptyTitle}>No courses found</Text>
          <Text style={styles.emptySubtitle}>
            No courses are set up for your department and semester yet. You can skip for now.
          </Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <CourseRow
              course={item}
              checked={selected.has(item._id)}
              onToggle={() => toggle(item._id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Error */}
      {saveError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{saveError}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => handleConfirm(true)}
          disabled={saving}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (selected.size === 0 || saving) && styles.confirmBtnDisabled,
          ]}
          onPress={() => handleConfirm(false)}
          disabled={selected.size === 0 || saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.confirmText}>
              Confirm{selected.size > 0 ? ` (${selected.size})` : ""}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Course row ───────────────────────────────────────────────────────────────
function CourseRow({
  course, checked, onToggle,
}: {
  course: Course; checked: boolean; onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, checked && styles.rowSelected]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.courseCode}>{course.code}</Text>
        <Text style={styles.courseTitle}>{course.title}</Text>
        {course.description ? (
          <Text style={styles.courseDesc} numberOfLines={1}>{course.description}</Text>
        ) : null}
      </View>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title:    { fontSize: 26, fontWeight: "800", color: C.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: C.textSecondary, marginTop: 4 },

  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    margin: 16,
    padding: 14,
    backgroundColor: C.primaryLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  bannerIcon: { fontSize: 12, color: C.primary, marginTop: 1 },
  bannerText: { flex: 1, fontSize: 13, color: C.primary, lineHeight: 18, fontWeight: "500" },

  list:      { paddingHorizontal: 16, paddingBottom: 8 },
  separator: { height: 1, backgroundColor: C.border, marginLeft: 16 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderRadius: 0,
  },
  rowSelected: { backgroundColor: C.primaryLight },
  rowLeft:     { flex: 1, minWidth: 0 },
  courseCode:  { fontSize: 12, fontWeight: "700", color: C.primary, letterSpacing: 0.4, textTransform: "uppercase" },
  courseTitle: { fontSize: 15, fontWeight: "600", color: C.textPrimary, marginTop: 2 },
  courseDesc:  { fontSize: 12, color: C.textSecondary, marginTop: 2 },

  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: C.primary, borderColor: C.primary },
  checkmark:       { color: "#fff", fontSize: 12, fontWeight: "700" },

  center:        { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32 },
  stateEmoji:    { fontSize: 36 },
  stateText:     { fontSize: 14, color: C.textSecondary, textAlign: "center" },
  emptyTitle:    { fontSize: 16, fontWeight: "700", color: C.textPrimary },
  emptySubtitle: { fontSize: 13, color: C.textSecondary, textAlign: "center", lineHeight: 20 },
  retryBtn: {
    marginTop: 4, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: C.primary, borderRadius: 12,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  errorBanner: {
    marginHorizontal: 16, marginBottom: 8,
    padding: 12, backgroundColor: "#FEF2F2",
    borderRadius: 12, borderWidth: 1, borderColor: "#FECACA",
  },
  errorText: { fontSize: 13, color: "#B91C1C", textAlign: "center" },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  skipBtn:  { paddingHorizontal: 16, paddingVertical: 12 },
  skipText: { fontSize: 14, color: C.textSecondary, fontWeight: "600" },
  confirmBtn: {
    flex: 1, height: 50,
    backgroundColor: C.primary,
    borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  confirmBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  confirmText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
