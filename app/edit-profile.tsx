import { useAuthStore } from "@/store/auth";
import { ColorPalette as C } from "@/styles";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DEPARTMENTS = [
  "Computer Science",
  "Software Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Business Administration",
  "Accounting & Finance",
  "Mass Communication",
  "Psychology",
  "Mathematics",
];

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export default function EditProfileScreen() {
  const { user, updateProfile, uploadAvatar } = useAuthStore();

  const [name, setName]             = useState(user?.fullName ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [semester, setSemester]     = useState(user?.semester ?? "");
  const [section, setSection]       = useState(user?.section ?? "");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [showSemPicker, setShowSemPicker]   = useState(false);
  const [pickedImage, setPickedImage] = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const avatarUri = pickedImage ?? user?.profileImage ?? null;

  const isDirty =
    name.trim() !== (user?.fullName ?? "") ||
    department !== (user?.department ?? "") ||
    semester !== (user?.semester ?? "") ||
    section !== (user?.section ?? "") ||
    pickedImage !== null;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Photo library permission is required to change your photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setPickedImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      if (pickedImage) {
        await uploadAvatar(pickedImage);
      }
      await updateProfile({ fullName: name.trim(), department, semester, section });
      router.back();
    } catch (err: any) {
      setError(err.message ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  const avatarInitials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.headerBtn}
          disabled={!isDirty || saving}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.saveText, (!isDirty || saving) && styles.saveTextDisabled]}>
            {saving ? "Saving…" : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{avatarInitials}</Text>
                )}
              </View>
              <TouchableOpacity style={styles.avatarCameraBtn} activeOpacity={0.8} onPress={pickImage}>
                <Text style={styles.cameraIcon}>📷</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.changePhotoText}>Change photo</Text>
          </View>

          {/* Error banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorIcon}>!</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Personal */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Personal</Text>
            <View style={styles.card}>
              <Field label="Full Name">
                <TextInput
                  style={inputStyle("name")}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your full name"
                  placeholderTextColor={C.placeholder}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                />
              </Field>
            </View>
          </View>

          {/* Academic */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Academic</Text>
            <View style={styles.card}>
              <Field label="Department">
                <TouchableOpacity
                  style={[styles.input, styles.pickerRow]}
                  onPress={() => setShowDeptPicker(true)}
                  activeOpacity={0.75}
                >
                  <Text style={department ? styles.pickerVal : styles.pickerPlaceholder}>
                    {department || "Select department"}
                  </Text>
                  <Text style={styles.chevron}>⌄</Text>
                </TouchableOpacity>
              </Field>

              <CardDivider />

              <Field label="Semester & Section">
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.input, styles.pickerRow, styles.flex]}
                    onPress={() => setShowSemPicker(true)}
                    activeOpacity={0.75}
                  >
                    <Text style={semester ? styles.pickerVal : styles.pickerPlaceholder}>
                      {semester ? `Semester ${semester}` : "Select"}
                    </Text>
                    <Text style={styles.chevron}>⌄</Text>
                  </TouchableOpacity>
                  <View style={styles.rowGap} />
                  <TextInput
                    style={[inputStyle("section"), styles.sectionInput]}
                    value={section}
                    onChangeText={(t) => setSection(t.toUpperCase())}
                    placeholder="A"
                    placeholderTextColor={C.placeholder}
                    autoCapitalize="characters"
                    maxLength={3}
                    onFocus={() => setFocusedField("section")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </Field>
            </View>
          </View>

          {/* Account (read-only) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Account</Text>
            <View style={styles.card}>
              <Field label="University Email">
                <View style={styles.readonlyRow}>
                  <Text style={styles.readonlyValue}>{user?.email ?? "—"}</Text>
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedText}>🔒 Fixed</Text>
                  </View>
                </View>
              </Field>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Department picker */}
      <PickerModal
        visible={showDeptPicker}
        title="Department"
        options={DEPARTMENTS}
        selected={department}
        onSelect={(v) => { setDepartment(v); setShowDeptPicker(false); }}
        onClose={() => setShowDeptPicker(false)}
      />

      {/* Semester picker */}
      <PickerModal
        visible={showSemPicker}
        title="Semester"
        options={SEMESTERS}
        selected={semester}
        onSelect={(v) => { setSemester(v); setShowSemPicker(false); }}
        onClose={() => setShowSemPicker(false)}
        renderOption={(opt) => `Semester ${opt}`}
      />
    </SafeAreaView>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function CardDivider() {
  return <View style={styles.cardDivider} />;
}

// ─── Picker modal ─────────────────────────────────────────────────────────────
type PickerModalProps = {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  renderOption?: (opt: string) => string;
};

function PickerModal({ visible, title, options, selected, onSelect, onClose, renderOption }: PickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt) => {
              const active = selected === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.modalOption, active && styles.modalOptionActive]}
                  onPress={() => onSelect(opt)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalOptionText, active && styles.modalOptionTextActive]}>
                    {renderOption ? renderOption(opt) : opt}
                  </Text>
                  {active && (
                    <View style={styles.modalCheck}>
                      <Text style={styles.modalCheckText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  scroll: { paddingBottom: 48 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerBtn: { minWidth: 60 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: C.textPrimary },
  cancelText: { fontSize: 15, color: C.textSecondary, fontWeight: "500" },
  saveText: { fontSize: 15, fontWeight: "700", color: C.primary, textAlign: "right" },
  saveTextDisabled: { color: C.placeholder },

  avatarSection: {
    alignItems: "center",
    paddingVertical: 28,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  avatarWrap: { position: "relative", marginBottom: 10 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  avatarText: { color: C.white, fontSize: 32, fontWeight: "800" },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarCameraBtn: {
    position: "absolute",
    bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.card,
    borderWidth: 2, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  cameraIcon: { fontSize: 14 },
  changePhotoText: { fontSize: 13, fontWeight: "600", color: C.primary },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 16,
    marginBottom: 0,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  errorIcon: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#EF4444",
    color: "#fff",
    fontSize: 13, fontWeight: "800",
    textAlign: "center",
    lineHeight: 20,
  },
  errorText: { flex: 1, fontSize: 13, color: "#B91C1C", fontWeight: "500" },

  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionLabel: {
    fontSize: 12, fontWeight: "700",
    color: C.textSecondary, letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8, paddingHorizontal: 4,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: "#1E1060",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardDivider: { height: 1, backgroundColor: C.border, marginLeft: 16 },

  field: { padding: 14, gap: 8 },
  fieldLabel: {
    fontSize: 11, fontWeight: "700",
    color: C.textSecondary, letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    height: 46,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: C.textPrimary,
    backgroundColor: C.inputBg,
  },
  inputFocused: {
    borderColor: C.borderFocus,
    backgroundColor: C.white,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },

  pickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerVal: { fontSize: 15, color: C.textPrimary },
  pickerPlaceholder: { fontSize: 15, color: C.placeholder },
  chevron: { fontSize: 18, color: C.textSecondary },

  row: { flexDirection: "row", alignItems: "center" },
  rowGap: { width: 10 },
  sectionInput: { width: 70 },

  readonlyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  readonlyValue: { fontSize: 14, color: C.textSecondary, flex: 1 },
  lockedBadge: {
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.border,
  },
  lockedText: { fontSize: 11, fontWeight: "600", color: C.placeholder },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(10,8,30,0.45)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  modalHandle: {
    width: 36, height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12, marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: C.textPrimary, marginBottom: 14 },
  modalOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 2,
  },
  modalOptionActive: { backgroundColor: C.primaryLight },
  modalOptionText: { fontSize: 15, color: C.textPrimary },
  modalOptionTextActive: { color: C.primary, fontWeight: "600" },
  modalCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.primary,
    alignItems: "center", justifyContent: "center",
  },
  modalCheckText: { color: C.white, fontSize: 12, fontWeight: "700" },
});
