import { useAuthStore } from "@/store/auth";
import { useGroupsStore } from "@/store/groups";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type GroupType = "study" | "club" | "announcement";

const TYPE_OPTIONS: { type: GroupType; label: string; desc: string; color: string; teacherOnly?: boolean }[] = [
  { type: "study",        label: "Study Group",    desc: "Study with classmates on a topic or course",  color: "#EC4899" },
  { type: "club",         label: "Club / Society",  desc: "Build a community around shared interests",   color: "#8B5CF6" },
  { type: "announcement", label: "Announcement",    desc: "Broadcast messages — only you can post",      color: "#EF4444", teacherOnly: true },
];

export default function CreateGroupScreen() {
  const { user, token }      = useAuthStore();
  const { createGroup }      = useGroupsStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);
  const [name, setName]      = useState("");
  const [desc, setDesc]      = useState("");
  const [type, setType]      = useState<GroupType>("study");
  const [isPublic, setPublic] = useState(true);
  const [saving, setSaving]  = useState(false);
  const [error, setError]    = useState<string | null>(null);

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  const visibleOptions = TYPE_OPTIONS.filter((o) => !o.teacherOnly || isTeacher);

  const handleCreate = async () => {
    if (!name.trim()) { setError("Group name is required."); return; }
    setError(null);
    setSaving(true);
    try {
      const group = await createGroup(token!, {
        name:        name.trim(),
        description: desc.trim() || undefined,
        type,
        isPublic: type === "announcement" ? true : isPublic,
      });
      router.replace(`/chat/${group._id}?name=${encodeURIComponent(group.name)}` as any);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Group</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <Text style={styles.label}>Group Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Database Study Group"
          placeholderTextColor={C.placeholder}
          value={name}
          onChangeText={setName}
          maxLength={80}
          returnKeyType="next"
        />

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.inputMulti]}
          placeholder="What is this group about?"
          placeholderTextColor={C.placeholder}
          value={desc}
          onChangeText={setDesc}
          multiline
          maxLength={300}
          returnKeyType="done"
        />

        {/* Type picker */}
        <Text style={styles.label}>Group Type</Text>
        <View style={styles.typeGrid}>
          {visibleOptions.map((opt) => {
            const active = type === opt.type;
            return (
              <TouchableOpacity
                key={opt.type}
                style={[styles.typeCard, active && { borderColor: opt.color, backgroundColor: opt.color + "11" }]}
                onPress={() => setType(opt.type)}
                activeOpacity={0.8}
              >
                <View style={[styles.typeRadio, active && { backgroundColor: opt.color, borderColor: opt.color }]}>
                  {active && <View style={styles.typeRadioDot} />}
                </View>
                <View style={styles.typeCardBody}>
                  <Text style={[styles.typeCardLabel, active && { color: opt.color }]}>{opt.label}</Text>
                  <Text style={styles.typeCardDesc}>{opt.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Public toggle (not for announcements — always public) */}
        {type !== "announcement" && (
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Public group</Text>
              <Text style={styles.toggleSub}>Anyone can find and join this group</Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setPublic}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor="#fff"
            />
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createBtn, (!name.trim() || saving) && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={!name.trim() || saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.createBtnText}>Create Group</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn:     { padding: 4 },
  backIcon:    { fontSize: 28, color: C.primary, lineHeight: 32, fontWeight: "300" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: C.textPrimary },

  label: { fontSize: 13, fontWeight: "700", color: C.textSecondary, marginTop: 20, marginBottom: 8, letterSpacing: 0.3 },

  input: {
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: C.textPrimary,
  },
  inputMulti: { minHeight: 90, textAlignVertical: "top", paddingTop: 12 },

  typeGrid: { gap: 10 },
  typeCard: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 12, padding: 14,
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1.5, borderColor: C.border,
  },
  typeRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0, marginTop: 1,
  },
  typeRadioDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  typeCardBody:  { flex: 1 },
  typeCardLabel: { fontSize: 15, fontWeight: "700", color: C.textPrimary, marginBottom: 2 },
  typeCardDesc:  { fontSize: 12, color: C.textSecondary, lineHeight: 17 },

  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 20, padding: 16,
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
  },
  toggleLabel: { fontSize: 15, fontWeight: "600", color: C.textPrimary },
  toggleSub:   { fontSize: 12, color: C.textSecondary, marginTop: 2 },

  errorBanner: {
    marginTop: 16, padding: 12,
    backgroundColor: "#FEF2F2", borderRadius: 12,
    borderWidth: 1, borderColor: "#FECACA",
  },
  errorText: { fontSize: 13, color: "#B91C1C", textAlign: "center" },

  footer: {
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
  },
  createBtn: {
    height: 52, backgroundColor: C.primary, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  createBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  createBtnText:     { color: "#fff", fontSize: 16, fontWeight: "700" },
  });
}
