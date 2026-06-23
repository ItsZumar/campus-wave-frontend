import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  name: string;
  imageUri?: string | null;
  size?: number;
  bgColor?: string;
  onLongPress?: () => void;
}

export function ProfileAvatar({ name, imageUri, size = 96, bgColor, onLongPress }: Props) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const bg = bgColor ?? C.primary;
  const initials = name.split(" ").map((n) => n[0] ?? "").join("").slice(0, 2).toUpperCase();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onLongPress={onLongPress}
      disabled={!imageUri || !onLongPress}
    >
      <View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, shadowColor: bg },
        ]}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <Text style={[styles.initials, { fontSize: Math.round(size * 0.35), color: C.white }]}>
            {initials}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center", justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  initials: { fontWeight: "800" },
});
