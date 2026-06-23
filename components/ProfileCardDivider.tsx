import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { View } from "react-native";

interface Props {
  indent?: number;
}

export function ProfileCardDivider({ indent = 62 }: Props) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  return <View style={{ height: 1, backgroundColor: C.border, marginLeft: indent }} />;
}
