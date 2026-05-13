import { AuthButton } from "@/components/AuthButton";
import { AuthInput } from "@/components/AuthInput";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
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

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const emailValid  = CAMPUS_EMAIL_REGEX.test(email.trim());
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

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your campus account</Text>

          <View style={styles.form}>
            <AuthInput
              label="Campus Email"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null); }}
              placeholder="you@university.edu.pk"
              keyboardType="email-address"
              returnKeyType="next"
              error={!!error}
              hint={email.length > 4 && !emailValid ? "Must be a campus email (e.g. .edu.pk)" : undefined}
            />

            <AuthInput
              label="Password"
              labelRight={
                <TouchableOpacity
                  onPress={() => router.push("/auth/forgot-password" as any)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              }
              value={password}
              onChangeText={(t) => { setPassword(t); setError(null); }}
              placeholder="Enter your password"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={isFormValid ? handleLogin : undefined}
              error={!!error}
            />

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorIcon}>!</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <AuthButton
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              disabled={!isFormValid}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/auth/signup")} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                <Text style={styles.signupLink}>Create one</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: C.bg },
    flex:   { flex: 1 },
    scroll: { paddingHorizontal: 20, paddingBottom: 48 },

    brand: { alignItems: "center", paddingTop: 48, paddingBottom: 10 },
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

    title:    { fontSize: 22, fontWeight: "700", color: C.textPrimary, textAlign: "center", marginBottom: 4 },
    subtitle: { fontSize: 14, color: C.textSecondary, textAlign: "center", marginBottom: 34 },

    form: { gap: 16 },

    forgotLink: { fontSize: 12, fontWeight: "700", color: C.primary },

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

    divider:     { flexDirection: "row", alignItems: "center", gap: 10 },
    dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
    dividerText: { fontSize: 13, color: C.textSecondary, fontWeight: "500" },

    signupRow:  { flexDirection: "row", justifyContent: "center", alignItems: "center" },
    signupText: { fontSize: 14, color: C.textSecondary },
    signupLink: { fontSize: 14, fontWeight: "700", color: C.primary },
  });
}
