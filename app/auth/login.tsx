import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CAMPUS_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.(edu|edu\.pk|ac\.pk)$/i;

export default function LoginScreen() {
  const { login } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = CAMPUS_EMAIL_REGEX.test(email.trim());
  const isFormValid = emailValid && password.length >= 1;

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message ?? "Incorrect email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => [styles.input, focusedField === field && styles.inputFocused, error && styles.inputError];

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
          <>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>Sign in to your campus account</Text>

            <View style={styles.form}>
              {/* Email */}
              <View style={styles.field}>
                <Text style={styles.label}>Campus Email</Text>
                <TextInput
                  style={inputStyle("email")}
                  placeholder="you@university.edu.pk"
                  placeholderTextColor={C.placeholder}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setError(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                />
                {email.length > 4 && !emailValid && <Text style={styles.fieldHint}>Must be a campus email (e.g. .edu.pk)</Text>}
              </View>

              {/* Password */}
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Password</Text>
                  <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.forgotLink}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.passwordWrap}>
                  <TextInput
                    style={[inputStyle("password"), styles.passwordInput]}
                    placeholder="Enter your password"
                    placeholderTextColor={C.placeholder}
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      setError(null);
                    }}
                    secureTextEntry={!passwordVisible}
                    returnKeyType="done"
                    onSubmitEditing={isFormValid ? handleLogin : undefined}
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
              </View>

              {/* Error banner */}
              {error && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorIcon}>!</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Login button */}
              <TouchableOpacity
                style={[styles.btn, (!isFormValid || loading) && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={!isFormValid || loading}
                activeOpacity={0.88}
              >
                {loading ? <ActivityIndicator color={C.white} size="small" /> : <Text style={styles.btnText}>Sign In</Text>}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Sign up link */}
              <View style={styles.signupRow}>
                <Text style={styles.signupText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/auth/signup")} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                  <Text style={styles.signupLink}>Create one</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  // Brand
  brand: { alignItems: "center", paddingTop: 48, paddingBottom: 10 },
  logoRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  logoInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 20, fontWeight: "800", color: C.white, letterSpacing: 0.5 },

  cardTitle: { fontSize: 22, fontWeight: "700", color: C.textPrimary, marginBottom: 4, textAlign: "center" },
  cardSubtitle: { fontSize: 14, color: C.textSecondary, marginBottom: 34, textAlign: "center" },

  // Form
  form: { gap: 16 },
  field: { gap: 6 },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  forgotLink: { fontSize: 12, fontWeight: "700", color: C.primary },

  fieldHint: { fontSize: 12, color: C.error, marginTop: 2 },

  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
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
  inputError: { borderColor: C.error },

  passwordWrap: { position: "relative" },
  passwordInput: { paddingRight: 68 },
  eyeBtn: { position: "absolute", right: 16, top: 0, bottom: 0, justifyContent: "center" },
  eyeLabel: { fontSize: 12, fontWeight: "700", color: C.primary, letterSpacing: 0.3 },

  // Error banner
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
    backgroundColor: C.error,
    color: C.white,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 20,
  },
  errorText: { flex: 1, fontSize: 13, color: "#B91C1C", fontWeight: "500" },

  // Button
  btn: {
    height: 54,
    backgroundColor: C.primary,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  btnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  btnText: { color: C.white, fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },

  // Divider
  divider: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 13, color: C.textSecondary, fontWeight: "500" },

  // Sign up
  signupRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  signupText: { fontSize: 14, color: C.textSecondary },
  signupLink: { fontSize: 14, fontWeight: "700", color: C.primary },
  });
}
