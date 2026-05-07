import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function ErrorBanner({ message }: { message: string }) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>!</Text>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      gap: 10,
      padding: 14,
      borderRadius: 12,
      backgroundColor: "#FEF2F2",
      borderWidth: 1,
      borderColor: "#FECACA",
    },

    icon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      textAlign: "center",
      lineHeight: 20,
      backgroundColor: C.error,
      color: C.white,
      fontWeight: "700",
    },

    text: {
      flex: 1,
      color: "#B91C1C",
    },
  });
}
