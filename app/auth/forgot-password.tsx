import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { BASE_URL } from "@/services/api";
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

export default function ForgotPasswordScreen() {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  const [email, setEmail] = useState("");
  const [focusedField, setFocusedField] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

          <Text style={styles.cardTitle}>Forgot password?</Text>
          <Text style={styles.cardSubtitle}>Enter your campus email and we'll send you a 6-digit reset code.</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Campus Email</Text>
              <TextInput
                style={[styles.input, focusedField && styles.inputFocused, error ? styles.inputError : null]}
                placeholder="you@university.edu.pk"
                placeholderTextColor={C.placeholder}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(null); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="send"
                onSubmitEditing={emailValid ? handleSend : undefined}
                onFocus={() => setFocusedField(true)}
                onBlur={() => setFocusedField(false)}
              />
              {email.length > 4 && !emailValid && (
                <Text style={styles.fieldHint}>Must be a campus email (e.g. .edu.pk)</Text>
              )}
            </View>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorIcon}>!</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, (!emailValid || loading) && styles.btnDisabled]}
              onPress={handleSend}
              disabled={!emailValid || loading}
              activeOpacity={0.88}
            >
              {loading
                ? <ActivityIndicator color={C.white} size="small" />
                : <Text style={styles.btnText}>Send Reset Code</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backRow} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backText}>‹ Back to Sign In</Text>
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
      alignItems: "center", justifyContent: "center",
      marginBottom: 14,
      shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18, shadowRadius: 12, elevation: 6,
    },
    logoInner: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: C.primary,
      alignItems: "center", justifyContent: "center",
    },
    logoText: { fontSize: 20, fontWeight: "800", color: C.white, letterSpacing: 0.5 },

    cardTitle:    { fontSize: 22, fontWeight: "700", color: C.textPrimary, marginBottom: 4, textAlign: "center" },
    cardSubtitle: { fontSize: 14, color: C.textSecondary, marginBottom: 34, textAlign: "center", lineHeight: 20 },

    form:  { gap: 16 },
    field: { gap: 6 },

    label: { fontSize: 12, fontWeight: "700", color: C.textSecondary, letterSpacing: 0.5, textTransform: "uppercase" },
    fieldHint: { fontSize: 12, color: C.error, marginTop: 2 },

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
    btnText: { color: C.white, fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },

    backRow: { alignItems: "center", marginTop: 4 },
    backText: { fontSize: 14, fontWeight: "700", color: C.primary },
  });
}
