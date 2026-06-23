import { AuthBrand } from "@/components/AuthBrand";
import { AuthButton } from "@/components/AuthButton";
import { AuthErrorBanner } from "@/components/AuthErrorBanner";
import { AuthInput } from "@/components/AuthInput";
import { AuthNavLink } from "@/components/AuthNavLink";
import { OptionPickerSheet } from "@/components/OptionPickerSheet";
import { BASE_URL } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const [departments, setDepartments]       = useState<string[]>([]);
  const [deptLoading, setDeptLoading]       = useState(true);
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [showSemPicker, setShowSemPicker]   = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE_URL}/departments/public`)
      .then((r) => r.json())
      .then((data) => setDepartments(data.departments.map((d: { name: string }) => d.name)))
      .catch(() => {})
      .finally(() => setDeptLoading(false));
  }, []);

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

          <AuthBrand />

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
              <TouchableOpacity style={styles.pickerInput} onPress={() => setShowDeptPicker(true)} activeOpacity={0.75} disabled={deptLoading}>
                <Text style={department ? styles.pickerVal : styles.pickerPlaceholder}>
                  {deptLoading ? "Loading departments…" : department || "Select your department"}
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

            {error && <AuthErrorBanner message={error} />}

            <AuthButton
              label="Create Account"
              onPress={handleSubmit}
              loading={loading}
              disabled={!isFormValid}
            />

            <AuthNavLink
              text="Already have an account? "
              linkLabel="Sign in"
              onPress={() => router.push("/auth/login")}
            />

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Pickers */}
      <OptionPickerSheet
        visible={showDeptPicker}
        title="Department"
        options={departments}
        selected={department}
        onSelect={(v) => { setDepartment(v); setShowDeptPicker(false); }}
        onClose={() => setShowDeptPicker(false)}
      />
      <OptionPickerSheet
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

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(C: typeof ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: C.bg },
    flex:   { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingBottom: 48 },

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
