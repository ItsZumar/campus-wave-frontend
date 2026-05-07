import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";

type Props = {
  title: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export default function AuthButton({ title, loading, disabled, onPress }: Props) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  return (
    <TouchableOpacity style={[styles.btn, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      {loading ? <ActivityIndicator color={C.white} /> : <Text style={styles.text}>{title}</Text>}
    </TouchableOpacity>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    btn: {
      height: 54,
      borderRadius: 16,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    disabled: {
      opacity: 0.5,
    },

    text: {
      color: C.white,
      fontSize: 16,
      fontWeight: "700",
    },
  });
}
