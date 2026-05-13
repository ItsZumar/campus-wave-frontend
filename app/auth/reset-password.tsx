import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { BASE_URL } from "@/services/api";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
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

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const otpRefs = useRef<(TextInput | null)[]>([]);

  const otpValue = otp.join("");
  const passwordsMatch = newPassword === confirmPassword;
  const isFormValid = otpValue.length === 6 && newPassword.length >= 6 && passwordsMatch;

  const handleOtpChange = (val: string, idx: number) => {
    const digit = val.replace(/[^0-9]/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    setError(null);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleReset = async () => {
    if (!isFormValid) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpValue, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Something went wrong");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? "Could not reset password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch {
      setError("Could not resend code. Check your connection.");
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successWrap}>
          <View style={styles.successCircle}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Password reset!</Text>
          <Text style={styles.successSub}>Your password has been updated. Sign in with your new password.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace("/auth/login" as any)} activeOpacity={0.88}>
            <Text style={styles.btnText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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

          <Text style={styles.cardTitle}>Enter reset code</Text>
          <Text style={styles.cardSubtitle}>
            We sent a 6-digit code to{"\n"}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          <View style={styles.form}>
            {/* OTP boxes */}
            <View style={styles.otpRow}>
              {otp.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={(r) => { otpRefs.current[idx] = r; }}
                  style={[styles.otpBox, focusedField === `otp${idx}` && styles.otpBoxFocused, error ? styles.otpBoxError : null]}
                  value={digit}
                  onChangeText={(v) => handleOtpChange(v, idx)}
                  onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                  onFocus={() => setFocusedField(`otp${idx}`)}
                  onBlur={() => setFocusedField(null)}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.resendRow} onPress={handleResend} disabled={resending} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {resending
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Text style={styles.resendText}>Didn't get it? <Text style={styles.resendLink}>Resend code</Text></Text>}
            </TouchableOpacity>

            {/* New password */}
            <View style={styles.field}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, styles.passwordInput, focusedField === "pass" && styles.inputFocused]}
                  placeholder="At least 6 characters"
                  placeholderTextColor={C.placeholder}
                  value={newPassword}
                  onChangeText={(t) => { setNewPassword(t); setError(null); }}
                  secureTextEntry={!passwordVisible}
                  returnKeyType="next"
                  onFocus={() => setFocusedField("pass")}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setPasswordVisible((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.eyeLabel}>{passwordVisible ? "Hide" : "Show"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm password */}
            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={[styles.input, focusedField === "confirm" && styles.inputFocused, confirmPassword.length > 0 && !passwordsMatch && styles.inputError]}
                placeholder="Re-enter your password"
                placeholderTextColor={C.placeholder}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
                secureTextEntry={!passwordVisible}
                returnKeyType="done"
                onSubmitEditing={isFormValid ? handleReset : undefined}
                onFocus={() => setFocusedField("confirm")}
                onBlur={() => setFocusedField(null)}
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <Text style={styles.fieldHint}>Passwords don't match</Text>
              )}
            </View>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorIcon}>!</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, (!isFormValid || loading) && styles.btnDisabled]}
              onPress={handleReset}
              disabled={!isFormValid || loading}
              activeOpacity={0.88}
            >
              {loading
                ? <ActivityIndicator color={C.white} size="small" />
                : <Text style={styles.btnText}>Reset Password</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backRow} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    safe:  { flex: 1, backgroundColor: C.bg },
    flex:  { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingBottom: 48 },

    brand: { alignItems: "center", paddingTop: 48, paddingBottom: 10 },
    logoRing: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: C.primaryLight,
      alignItems: "center", justifyContent: "center", marginBottom: 14,
      shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18, shadowRadius: 12, elevation: 6,
    },
    logoInner: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
    },
    logoText: { fontSize: 20, fontWeight: "800", color: C.white, letterSpacing: 0.5 },

    cardTitle:      { fontSize: 22, fontWeight: "700", color: C.textPrimary, marginBottom: 4, textAlign: "center" },
    cardSubtitle:   { fontSize: 14, color: C.textSecondary, marginBottom: 34, textAlign: "center", lineHeight: 22 },
    emailHighlight: { color: C.primary, fontWeight: "700" },

    form:  { gap: 16 },
    field: { gap: 6 },

    label:     { fontSize: 12, fontWeight: "700", color: C.textSecondary, letterSpacing: 0.5, textTransform: "uppercase" },
    fieldHint: { fontSize: 12, color: C.error, marginTop: 2 },

    // OTP
    otpRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    otpBox: {
      flex: 1, height: 56, borderWidth: 1.5, borderColor: C.border,
      borderRadius: 14, fontSize: 22, fontWeight: "700",
      color: C.textPrimary, backgroundColor: C.inputBg,
    },
    otpBoxFocused: {
      borderColor: C.borderFocus, backgroundColor: C.white,
      shadowColor: C.primary, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15, shadowRadius: 6, elevation: 2,
    },
    otpBoxError: { borderColor: C.error },

    resendRow: { alignItems: "center" },
    resendText: { fontSize: 13, color: C.textSecondary },
    resendLink: { color: C.primary, fontWeight: "700" },

    input: {
      height: 50, borderWidth: 1.5, borderColor: C.border,
      borderRadius: 14, paddingHorizontal: 16,
      fontSize: 15, color: C.textPrimary, backgroundColor: C.inputBg,
    },
    inputFocused: {
      borderColor: C.borderFocus, backgroundColor: C.white,
      shadowColor: C.primary, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.12, shadowRadius: 6, elevation: 2,
    },
    inputError: { borderColor: C.error },

    passwordWrap:  { position: "relative" },
    passwordInput: { paddingRight: 68 },
    eyeBtn:        { position: "absolute", right: 16, top: 0, bottom: 0, justifyContent: "center" },
    eyeLabel:      { fontSize: 12, fontWeight: "700", color: C.primary, letterSpacing: 0.3 },

    errorBanner: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
      borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
    },
    errorIcon: {
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: C.error, color: C.white,
      fontSize: 13, fontWeight: "800", textAlign: "center", lineHeight: 20,
    },
    errorText: { flex: 1, fontSize: 13, color: "#B91C1C", fontWeight: "500" },

    btn: {
      height: 54, backgroundColor: C.primary, borderRadius: 16,
      alignItems: "center", justifyContent: "center", marginTop: 4,
      shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
    },
    btnDisabled: { opacity: 0.4, shadowOpacity: 0 },
    btnText:     { color: C.white, fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },

    backRow: { alignItems: "center", marginTop: 4 },
    backText: { fontSize: 14, fontWeight: "700", color: C.primary },

    // Success state
    successWrap: {
      flex: 1, alignItems: "center", justifyContent: "center",
      paddingHorizontal: 32, gap: 16,
    },
    successCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: "#D1FAE5",
      alignItems: "center", justifyContent: "center", marginBottom: 8,
    },
    successIcon:  { fontSize: 36, color: "#059669" },
    successTitle: { fontSize: 22, fontWeight: "800", color: C.textPrimary },
    successSub:   { fontSize: 14, color: C.textSecondary, textAlign: "center", lineHeight: 22 },
  });
}
