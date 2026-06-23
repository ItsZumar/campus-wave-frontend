import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  text: string;
  linkLabel: string;
  onPress: () => void;
}

export function AuthNavLink({ text, linkLabel, onPress }: Props) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  return (
    <View style={styles.row}>
      <Text style={styles.text}>{text}</Text>
      <TouchableOpacity onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
        <Text style={styles.link}>{linkLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    row:  { flexDirection: "row", justifyContent: "center", alignItems: "center" },
    text: { fontSize: 14, color: C.textSecondary },
    link: { fontSize: 14, fontWeight: "700", color: C.primary },
  });
}
