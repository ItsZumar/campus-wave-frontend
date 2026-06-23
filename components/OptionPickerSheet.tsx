import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface OptionPickerSheetProps {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  renderOption?: (option: string) => string;
}

export function OptionPickerSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  renderOption,
}: OptionPickerSheetProps) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {options.map((opt) => {
              const active = selected === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => onSelect(opt)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {renderOption ? renderOption(opt) : opt}
                  </Text>
                  {active && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkBadgeText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(10,8,30,0.45)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingHorizontal: 20, paddingBottom: 36, maxHeight: "72%",
    },
    handle: {
      width: 36, height: 4, backgroundColor: C.border,
      borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 20,
    },
    title:  { fontSize: 18, fontWeight: "700", color: C.textPrimary, marginBottom: 8 },
    scroll: { flexGrow: 0 },
    option: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingVertical: 15, paddingHorizontal: 14, borderRadius: 12, marginBottom: 2,
    },
    optionActive:     { backgroundColor: C.primaryLight },
    optionText:       { fontSize: 15, color: C.textPrimary },
    optionTextActive: { color: C.primary, fontWeight: "600" },
    checkBadge: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
    },
    checkBadgeText: { fontSize: 12, color: C.white, fontWeight: "700" },
  });
}
