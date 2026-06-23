import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  message: string;
}

export function AuthErrorBanner({ message }: Props) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>!</Text>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    banner: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: "#FEF2F2",
      borderWidth: 1, borderColor: "#FECACA",
      borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
    },
    icon: {
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: C.error, color: C.white,
      fontSize: 13, fontWeight: "800", textAlign: "center", lineHeight: 20,
    },
    text: { flex: 1, fontSize: 13, color: "#B91C1C", fontWeight: "500" },
  });
}
