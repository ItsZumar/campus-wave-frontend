import { AuthButton } from "@/components/AuthButton";
import { AuthInput } from "@/components/AuthInput";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C, isDark), [isDark]);

  const [role, setRole]               = useState<"student" | "teacher">("student");
  const [fullName, setFullName]       = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [department, setDepartment]   = useState("");
  const [semester, setSemester]       = useState("");
  const [section, setSection]         = useState("");
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [showSemPicker, setShowSemPicker]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const isStudent   = role === "student";
  const isFormValid = fullName.trim() && email.trim() && password.trim() &&
    (isStudent ? department && semester && section.trim() : true);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signup({
        fullName, email, password, role,
        department: isStudent ? department : "",
        semester:   isStudent ? semester   : "",
        section:    isStudent ? section    : "",
      });
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.logoRing}>
              <View style={styles.logoInner}>
                <Text style={styles.logoText}>CW</Text>
              </View>
            </View>
          </View>

          <Text style={styles.title}>Create your account</Text>

          <View style={styles.form}>

            <AuthInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ahmed Khan"
              autoCapitalize="words"
              returnKeyType="next"
            />

            <AuthInput
              label="University Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@university.edu.pk"
              keyboardType="email-address"
              returnKeyType="next"
            />

            {/* Role toggle */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>I am a</Text>
              <View style={styles.roleToggle}>
                <TouchableOpacity
                  style={[styles.roleBtn, isStudent && styles.roleBtnActive]}
                  onPress={() => { setRole("student"); setSemester(""); setSection(""); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.roleBtnText, isStudent && styles.roleBtnTextActive]}>Student</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleBtn, !isStudent && styles.roleBtnActive]}
                  onPress={() => { setRole("teacher"); setSemester(""); setSection(""); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.roleBtnText, !isStudent && styles.roleBtnTextActive]}>Teacher</Text>
                </TouchableOpacity>
              </View>
            </View>

            <AuthInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 characters"
              secureTextEntry
              returnKeyType="next"
            />

            {/* Department + Semester + Section — students only */}
            {isStudent && <View style={styles.field}>
              <Text style={styles.fieldLabel}>Department</Text>
              <TouchableOpacity style={styles.pickerInput} onPress={() => setShowDeptPicker(true)} activeOpacity={0.75}>
                <Text style={department ? styles.pickerVal : styles.pickerPlaceholder}>
                  {department || "Select your department"}
                </Text>
                <Text style={styles.chevron}>⌄</Text>
              </TouchableOpacity>
            </View>}
            {isStudent && (
              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Semester</Text>
                    <TouchableOpacity style={styles.pickerInput} onPress={() => setShowSemPicker(true)} activeOpacity={0.75}>
                      <Text style={semester ? styles.pickerVal : styles.pickerPlaceholder}>
                        {semester ? `Sem ${semester}` : "Select"}
                      </Text>
                      <Text style={styles.chevron}>⌄</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.rowGap} />
                <View style={styles.rowItem}>
                  <AuthInput
                    label="Section"
                    value={section}
                    onChangeText={(t) => setSection(t.toUpperCase())}
                    placeholder="A"
                    autoCapitalize="characters"
                    maxLength={3}
                    returnKeyType="done"
                  />
                </View>
              </View>
            )}

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorIcon}>!</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <AuthButton
              label="Create Account"
              onPress={handleSubmit}
              loading={loading}
              disabled={!isFormValid}
            />

            <View style={styles.signinRow}>
              <Text style={styles.signinText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/auth/login")} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                <Text style={styles.signinLink}>Sign in</Text>
              </TouchableOpacity>
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
        onSelect={(v) => { setDepartment(v); setShowDeptPicker(false); }}
        onClose={() => setShowDeptPicker(false)}
      />
      <PickerModal
        visible={showSemPicker}
        title="Semester"
        options={SEMESTERS}
        selected={semester}
        onSelect={(v) => { setSemester(v); setShowSemPicker(false); }}
        onClose={() => setShowSemPicker(false)}
        renderOption={(opt) => `Semester ${opt}`}
      />

      {/* Loading overlay */}
      {loading && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <View style={styles.overlaySpinner}>
              <ActivityIndicator size="large" color={C.primary} />
            </View>
            <Text style={styles.overlayTitle}>Setting up your campus…</Text>
            <Text style={styles.overlaySubtitle}>This will only take a moment</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
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
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makePickerStyles(C), [isDark]);

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
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {renderOption ? renderOption(opt) : opt}
                  </Text>
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
function makeStyles(C: typeof ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: C.bg },
    flex:   { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingBottom: 48 },

    brand: { alignItems: "center", paddingTop: 36 },
    logoRing: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: C.primaryLight,
      alignItems: "center", justifyContent: "center",
      marginBottom: 14,
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18, shadowRadius: 12, elevation: 6,
    },
    logoInner: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: C.primary,
      alignItems: "center", justifyContent: "center",
    },
    logoText: { fontSize: 20, fontWeight: "800", color: C.white, letterSpacing: 0.5 },

    title: { fontSize: 22, fontWeight: "700", color: C.textPrimary, marginBottom: 34, textAlign: "center" },

    form:       { gap: 16 },
    field:      { gap: 6 },
    fieldLabel: { fontSize: 12, fontWeight: "700", color: C.textSecondary, letterSpacing: 0.5, textTransform: "uppercase" },

    // Picker input (looks like a text input but is a TouchableOpacity)
    pickerInput: {
      height: 50,
      borderWidth: 1.5, borderColor: C.border,
      borderRadius: 14, paddingHorizontal: 16,
      backgroundColor: C.inputBg,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    pickerVal:         { fontSize: 15, color: C.textPrimary },
    pickerPlaceholder: { fontSize: 15, color: C.placeholder },
    chevron:           { fontSize: 18, color: C.textSecondary, lineHeight: 22 },

    row:     { flexDirection: "row" },
    rowItem: { flex: 1 },
    rowGap:  { width: 12 },

    // Role toggle
    roleToggle: {
      flexDirection: "row", borderWidth: 1.5, borderColor: C.border,
      borderRadius: 14, overflow: "hidden", backgroundColor: C.inputBg,
    },
    roleBtn:          { flex: 1, height: 50, alignItems: "center", justifyContent: "center" },
    roleBtnActive:    { backgroundColor: C.primary },
    roleBtnText:      { fontSize: 15, fontWeight: "600", color: C.textSecondary },
    roleBtnTextActive: { color: C.white },

    // Error banner
    errorBanner: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: "#FEF2F2",
      borderWidth: 1, borderColor: "#FECACA",
      borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
    },
    errorIcon: {
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: C.error, color: C.white,
      fontSize: 13, fontWeight: "800", textAlign: "center", lineHeight: 20,
    },
    errorText: { flex: 1, fontSize: 13, color: "#B91C1C", fontWeight: "500" },

    signinRow:  { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 4 },
    signinText: { fontSize: 14, color: C.textSecondary },
    signinLink: { fontSize: 14, fontWeight: "700", color: C.primary },

    // Loading overlay
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? "rgba(10,8,30,0.93)" : "rgba(247,246,255,0.93)",
      alignItems: "center", justifyContent: "center",
    },
    overlayCard: {
      alignItems: "center", backgroundColor: C.card,
      borderRadius: 24, paddingVertical: 36, paddingHorizontal: 48,
      gap: 12,
      shadowColor: "#1E1060",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1, shadowRadius: 24, elevation: 8,
    },
    overlaySpinner: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: C.primaryLight,
      alignItems: "center", justifyContent: "center", marginBottom: 4,
    },
    overlayTitle:    { fontSize: 17, fontWeight: "700", color: C.textPrimary },
    overlaySubtitle: { fontSize: 13, color: C.textSecondary },
  });
}

function makePickerStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(10,8,30,0.45)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingHorizontal: 20, paddingBottom: 36, maxHeight: "72%",
    },
    handle: {
      width: 36, height: 4, backgroundColor: C.border,
      borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 20,
    },
    sheetTitle:  { fontSize: 18, fontWeight: "700", color: C.textPrimary, marginBottom: 8 },
    sheetScroll: { flexGrow: 0 },
    option: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingVertical: 15, paddingHorizontal: 14, borderRadius: 12, marginBottom: 2,
    },
    optionActive:      { backgroundColor: C.primaryLight },
    optionText:        { fontSize: 15, color: C.textPrimary },
    optionTextActive:  { color: C.primary, fontWeight: "600" },
    optionCheck: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
    },
    optionCheckText: { fontSize: 12, color: C.white, fontWeight: "700" },
  });
}
