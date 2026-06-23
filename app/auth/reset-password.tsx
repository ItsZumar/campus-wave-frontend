import { AuthBrand } from "@/components/AuthBrand";
import { AuthButton } from "@/components/AuthButton";
import { AuthErrorBanner } from "@/components/AuthErrorBanner";
import { AuthInput } from "@/components/AuthInput";
import { AuthScreenLayout } from "@/components/AuthScreenLayout";
import { BASE_URL } from "@/services/api";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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

  const [otp, setOtp]                         = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [focusedOtpIdx, setFocusedOtpIdx]     = useState<number | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [resending, setResending]             = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [success, setSuccess]                 = useState(false);

  const otpRefs = useRef<(TextInput | null)[]>([]);

  const otpValue       = otp.join("");
  const passwordsMatch = newPassword === confirmPassword;
  const isFormValid    = otpValue.length === 6 && newPassword.length >= 6 && passwordsMatch;

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
          <Text style={styles.successSub}>
            Your password has been updated. Sign in with your new password.
          </Text>
          <AuthButton label="Back to Sign In" onPress={() => router.replace("/auth/login" as any)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AuthScreenLayout>
      <AuthBrand />
      <Text style={styles.cardTitle}>Enter reset code</Text>
      <Text style={styles.cardSubtitle}>
        We sent a 6-digit code to{"\n"}
        <Text style={styles.emailHighlight}>{email}</Text>
      </Text>

      <View style={styles.form}>
        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(r) => { otpRefs.current[idx] = r; }}
              style={[
                styles.otpBox,
                focusedOtpIdx === idx && styles.otpBoxFocused,
                error ? styles.otpBoxError : null,
              ]}
              value={digit}
              onChangeText={(v) => handleOtpChange(v, idx)}
              onKeyPress={(e) => handleOtpKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
              onFocus={() => setFocusedOtpIdx(idx)}
              onBlur={() => setFocusedOtpIdx(null)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.resendRow}
          onPress={handleResend}
          disabled={resending}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {resending
            ? <ActivityIndicator size="small" color={C.primary} />
            : <Text style={styles.resendText}>Didn't get it? <Text style={styles.resendLink}>Resend code</Text></Text>}
        </TouchableOpacity>

        <AuthInput
          label="New Password"
          value={newPassword}
          onChangeText={(t) => { setNewPassword(t); setError(null); }}
          placeholder="At least 6 characters"
          secureTextEntry
          returnKeyType="next"
        />

        <AuthInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={(t) => { setConfirmPassword(t); setError(null); }}
          placeholder="Re-enter your password"
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={isFormValid ? handleReset : undefined}
          error={confirmPassword.length > 0 && !passwordsMatch}
          hint={confirmPassword.length > 0 && !passwordsMatch ? "Passwords don't match" : undefined}
        />

        {error && <AuthErrorBanner message={error} />}

        <AuthButton
          label="Reset Password"
          onPress={handleReset}
          loading={loading}
          disabled={!isFormValid || loading}
        />

        <TouchableOpacity
          style={styles.backRow}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
      </View>
    </AuthScreenLayout>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },

    cardTitle:      { fontSize: 22, fontWeight: "700", color: C.textPrimary, marginBottom: 4, textAlign: "center" },
    cardSubtitle:   { fontSize: 14, color: C.textSecondary, marginBottom: 34, textAlign: "center", lineHeight: 22 },
    emailHighlight: { color: C.primary, fontWeight: "700" },

    form: { gap: 16 },

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

    resendRow:  { alignItems: "center" },
    resendText: { fontSize: 13, color: C.textSecondary },
    resendLink: { color: C.primary, fontWeight: "700" },

    backRow:  { alignItems: "center", marginTop: 4 },
    backText: { fontSize: 14, fontWeight: "700", color: C.primary },

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
