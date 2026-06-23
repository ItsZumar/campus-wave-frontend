import { AuthBrand } from "@/components/AuthBrand";
import { AuthButton } from "@/components/AuthButton";
import { AuthErrorBanner } from "@/components/AuthErrorBanner";
import { AuthInput } from "@/components/AuthInput";
import { AuthScreenLayout } from "@/components/AuthScreenLayout";
import { BASE_URL } from "@/services/api";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const CAMPUS_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.(edu|edu\.pk|ac\.pk)$/i;

export default function ForgotPasswordScreen() {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const emailValid = CAMPUS_EMAIL_REGEX.test(email.trim());

  const handleSend = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Something went wrong");
      router.push({ pathname: "/auth/reset-password", params: { email: email.trim() } } as any);
    } catch (err: any) {
      setError(err.message ?? "Could not send reset code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout>
      <AuthBrand />
      <Text style={styles.cardTitle}>Forgot password?</Text>
      <Text style={styles.cardSubtitle}>Enter your campus email and we'll send you a 6-digit reset code.</Text>

      <View style={styles.form}>
        <AuthInput
          label="Campus Email"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(null); }}
          placeholder="you@university.edu.pk"
          keyboardType="email-address"
          returnKeyType="send"
          onSubmitEditing={emailValid ? handleSend : undefined}
          autoFocus
          error={!!error}
          hint={email.length > 4 && !emailValid ? "Must be a campus email (e.g. .edu.pk)" : undefined}
        />

        {error && <AuthErrorBanner message={error} />}

        <AuthButton
          label="Send Reset Code"
          onPress={handleSend}
          loading={loading}
          disabled={!emailValid || loading}
        />

        <TouchableOpacity style={styles.backRow} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>‹ Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </AuthScreenLayout>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    cardTitle:    { fontSize: 22, fontWeight: "700", color: C.textPrimary, marginBottom: 4, textAlign: "center" },
    cardSubtitle: { fontSize: 14, color: C.textSecondary, marginBottom: 34, textAlign: "center", lineHeight: 20 },
    form:         { gap: 16 },
    backRow:      { alignItems: "center", marginTop: 4 },
    backText:     { fontSize: 14, fontWeight: "700", color: C.primary },
  });
}
