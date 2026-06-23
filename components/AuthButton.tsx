import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function AuthButton({ label, onPress, loading, disabled }: AuthButtonProps) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  return (
    <TouchableOpacity
      style={[styles.btn, (disabled || loading) && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.88}
    >
      {loading ? (
        <ActivityIndicator color={C.white} size="small" />
      ) : (
        <Text style={styles.btnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
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
  });
}
