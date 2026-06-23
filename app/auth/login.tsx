import { AuthBrand } from "@/components/AuthBrand";
import { AuthButton } from "@/components/AuthButton";
import { AuthDivider } from "@/components/AuthDivider";
import { AuthErrorBanner } from "@/components/AuthErrorBanner";
import { AuthInput } from "@/components/AuthInput";
import { AuthNavLink } from "@/components/AuthNavLink";
import { AuthScreenLayout } from "@/components/AuthScreenLayout";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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

  const clearError  = () => setError(null);
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
    <AuthScreenLayout>
      <AuthBrand />
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to your campus account</Text>

      <View style={styles.form}>
        <AuthInput
          label="Campus Email"
          value={email}
          onChangeText={(t) => { setEmail(t); clearError(); }}
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
          onChangeText={(t) => { setPassword(t); clearError(); }}
          placeholder="Enter your password"
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={isFormValid ? handleLogin : undefined}
          error={!!error}
        />

        {error && <AuthErrorBanner message={error} />}

        <AuthButton
          label="Sign In"
          onPress={handleLogin}
          loading={loading}
          disabled={!isFormValid}
        />

        <AuthDivider />

        <AuthNavLink
          text="Don't have an account? "
          linkLabel="Create one"
          onPress={() => router.push("/auth/signup")}
        />
      </View>
    </AuthScreenLayout>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    title:      { fontSize: 22, fontWeight: "700", color: C.textPrimary, textAlign: "center", marginBottom: 4 },
    subtitle:   { fontSize: 14, color: C.textSecondary, textAlign: "center", marginBottom: 34 },
    form:       { gap: 16 },
    forgotLink: { fontSize: 12, fontWeight: "700", color: C.primary },
  });
}
