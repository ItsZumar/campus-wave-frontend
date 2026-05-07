import { useAuthStore } from "@/store/auth";
import { ColorPalette } from "@/styles";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SignupScreen() {
  const { signup } = useAuthStore();
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [section, setSection] = useState("");
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [showSemPicker, setShowSemPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const isStudent = role === "student";

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signup({ fullName, email, password, role, department, semester: isStudent ? semester : "", section: isStudent ? section : "" });
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = fullName.trim() && email.trim() && password.trim() && department && (isStudent ? semester && section.trim() : true);

  const inputStyle = (field: string) => [styles.input, focusedField === field && styles.inputFocused];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Brand header */}
          <View style={styles.brand}>
            <View style={styles.logoRing}>
              <View style={styles.logoInner}>
                <Text style={styles.logoText}>CW</Text>
              </View>
            </View>
          </View>

          {/* Form card */}
          <View>
            <Text style={styles.cardTitle}>Create your account</Text>

            <View style={styles.form}>
              {/* Full Name */}
              <Field label="Full Name">
                <TextInput
                  style={inputStyle("name")}
                  placeholder="Ahmed Khan"
                  placeholderTextColor={ColorPalette.placeholder}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                />
              </Field>

              {/* Email */}
              <Field label="University Email">
                <TextInput
                  style={inputStyle("email")}
                  placeholder="you@university.edu.pk"
                  placeholderTextColor={ColorPalette.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                />
              </Field>

              {/* Role */}
              <Field label="I am a">
                <View style={styles.roleToggle}>
                  <TouchableOpacity
                    style={[styles.roleBtn, isStudent && styles.roleBtnActive]}
                    onPress={() => {
                      setRole("student");
                      setSemester("");
                      setSection("");
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.roleBtnText, isStudent && styles.roleBtnTextActive]}>Student</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleBtn, !isStudent && styles.roleBtnActive]}
                    onPress={() => {
                      setRole("teacher");
                      setSemester("");
                      setSection("");
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.roleBtnText, !isStudent && styles.roleBtnTextActive]}>Teacher</Text>
                  </TouchableOpacity>
                </View>
              </Field>

              {/* Password */}
              <Field label="Password">
                <View style={styles.passwordWrap}>
                  <TextInput
                    style={[inputStyle("password"), styles.passwordInput]}
                    placeholder="Min. 8 characters"
                    placeholderTextColor={ColorPalette.placeholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!passwordVisible}
                    returnKeyType="next"
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setPasswordVisible((v) => !v)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.eyeLabel}>{passwordVisible ? "Hide" : "Show"}</Text>
                  </TouchableOpacity>
                </View>
              </Field>

              {/* Department */}
              <Field label="Department">
                <TouchableOpacity style={[styles.input, styles.pickerRow]} onPress={() => setShowDeptPicker(true)} activeOpacity={0.75}>
                  <Text style={department ? styles.pickerVal : styles.pickerPlaceholder}>{department || "Select your department"}</Text>
                  <Text style={styles.chevron}>⌄</Text>
                </TouchableOpacity>
              </Field>

              {/* Semester + Section (students only) */}
              {isStudent && (
                <View style={styles.row}>
                  <View style={styles.rowItem}>
                    <Field label="Semester">
                      <TouchableOpacity
                        style={[styles.input, styles.pickerRow]}
                        onPress={() => setShowSemPicker(true)}
                        activeOpacity={0.75}
                      >
                        <Text style={semester ? styles.pickerVal : styles.pickerPlaceholder}>
                          {semester ? `Sem ${semester}` : "Select"}
                        </Text>
                        <Text style={styles.chevron}>⌄</Text>
                      </TouchableOpacity>
                    </Field>
                  </View>

                  <View style={styles.rowGap} />

                  <View style={styles.rowItem}>
                    <Field label="Section">
                      <TextInput
                        style={inputStyle("section")}
                        placeholder="A"
                        placeholderTextColor={ColorPalette.placeholder}
                        value={section}
                        onChangeText={(t) => setSection(t.toUpperCase())}
                        autoCapitalize="characters"
                        maxLength={3}
                        returnKeyType="done"
                        onFocus={() => setFocusedField("section")}
                        onBlur={() => setFocusedField(null)}
                      />
                    </Field>
                  </View>
                </View>
              )}

              {/* Error banner */}
              {error && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorIcon}>!</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Submit */}
              <TouchableOpacity
                style={[styles.btn, !isFormValid && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={!isFormValid || loading}
                activeOpacity={0.88}
              >
                <Text style={styles.btnText}>Create Account</Text>
              </TouchableOpacity>

              {/* Sign in link */}
              <View style={styles.signinRow}>
                <Text style={styles.signinText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/auth/login")} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                  <Text style={styles.signinLink}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Pickers */}
      <PickerModal
        visible={showDeptPicker}
        title="Department"
        options={DEPARTMENTS}
        selected={department}
        onSelect={(v) => {
          setDepartment(v);
          setShowDeptPicker(false);
        }}
        onClose={() => setShowDeptPicker(false)}
      />
      <PickerModal
        visible={showSemPicker}
        title="Semester"
        options={SEMESTERS}
        selected={semester}
        onSelect={(v) => {
          setSemester(v);
          setShowSemPicker(false);
        }}
        onClose={() => setShowSemPicker(false)}
        renderOption={(opt) => `Semester ${opt}`}
      />

      {/* Loading overlay */}
      {loading && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <View style={styles.overlaySpinner}>
              <ActivityIndicator size="large" color={ColorPalette.primary} />
            </View>
            <Text style={styles.overlayTitle}>Setting up your campus…</Text>
            <Text style={styles.overlaySubtitle}>This will only take a moment</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
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
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
            {options.map((opt) => {
              const active = selected === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => onSelect(opt)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{renderOption ? renderOption(opt) : opt}</Text>
                  {active && (
                    <View style={styles.optionCheck}>
                      <Text style={styles.optionCheckText}>✓</Text>
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
  safe: { flex: 1, backgroundColor: ColorPalette.bg },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  // Brand
  brand: { alignItems: "center", paddingTop: 36 },
  logoRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ColorPalette.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: ColorPalette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  logoInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ColorPalette.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 20, fontWeight: "800", color: ColorPalette.white, letterSpacing: 0.5 },
  cardDetails: { alignItems: "center" },
  cardTitle: { fontSize: 22, fontWeight: "700", color: ColorPalette.textPrimary, marginBottom: 34, textAlign: "center" },

  // Form
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: "700", color: ColorPalette.textSecondary, letterSpacing: 0.5, textTransform: "uppercase" },

  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: ColorPalette.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: ColorPalette.textPrimary,
    backgroundColor: ColorPalette.inputBg,
  },
  inputFocused: {
    borderColor: ColorPalette.borderFocus,
    backgroundColor: ColorPalette.white,
    shadowColor: ColorPalette.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },

  passwordWrap: { position: "relative" },
  passwordInput: { paddingRight: 68 },
  eyeBtn: { position: "absolute", right: 16, top: 0, bottom: 0, justifyContent: "center" },
  eyeLabel: { fontSize: 12, fontWeight: "700", color: ColorPalette.primary, letterSpacing: 0.3 },

  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerVal: { fontSize: 15, color: ColorPalette.textPrimary },
  pickerPlaceholder: { fontSize: 15, color: ColorPalette.placeholder },
  chevron: { fontSize: 18, color: ColorPalette.textSecondary, lineHeight: 22 },

  row: { flexDirection: "row" },
  rowItem: { flex: 1 },
  rowGap: { width: 12 },

  btn: {
    height: 54,
    backgroundColor: ColorPalette.primary,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: ColorPalette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  btnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  btnText: { color: ColorPalette.white, fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  errorIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ColorPalette.error,
    color: ColorPalette.white,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 20,
  },
  errorText: { flex: 1, fontSize: 13, color: "#B91C1C", fontWeight: "500" },

  roleToggle: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: ColorPalette.border,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: ColorPalette.inputBg,
  },
  roleBtn: {
    flex: 1,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  roleBtnActive: {
    backgroundColor: ColorPalette.primary,
  },
  roleBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: ColorPalette.textSecondary,
  },
  roleBtnTextActive: {
    color: ColorPalette.white,
  },

  signinRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 4 },
  signinText: { fontSize: 14, color: ColorPalette.textSecondary },
  signinLink: { fontSize: 14, fontWeight: "700", color: ColorPalette.primary },

  // Modal
  backdrop: { flex: 1, backgroundColor: "rgba(10,8,30,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: ColorPalette.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: "72%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: ColorPalette.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: ColorPalette.textPrimary, marginBottom: 8 },
  sheetScroll: { flexGrow: 0 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 2,
  },
  optionActive: { backgroundColor: ColorPalette.primaryLight },
  optionText: { fontSize: 15, color: ColorPalette.textPrimary },
  optionTextActive: { color: ColorPalette.primary, fontWeight: "600" },
  optionCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ColorPalette.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  optionCheckText: { fontSize: 12, color: ColorPalette.white, fontWeight: "700" },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(247,246,255,0.93)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayCard: {
    alignItems: "center",
    backgroundColor: ColorPalette.white,
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 48,
    gap: 12,
    shadowColor: "#1E1060",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  overlaySpinner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ColorPalette.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  overlayTitle: { fontSize: 17, fontWeight: "700", color: ColorPalette.textPrimary },
  overlaySubtitle: { fontSize: 13, color: ColorPalette.textSecondary },
});
