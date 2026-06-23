import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";

interface Props {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function LogoutConfirmModal({ visible, onCancel, onConfirm }: Props) {
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.iconWrap}>
                <Text style={styles.iconEmoji}>🚪</Text>
              </View>
              <Text style={styles.title}>Log Out</Text>
              <Text style={styles.subtitle}>
                You'll need to sign in again to access your account.
              </Text>
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} activeOpacity={0.8}>
                  <Text style={styles.confirmText}>Log Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    sheet: {
      backgroundColor: C.card,
      borderRadius: 24,
      padding: 28,
      alignItems: "center",
      width: "100%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 12,
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "#FEF2F2",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    iconEmoji: { fontSize: 32 },
    title: {
      fontSize: 18,
      fontWeight: "800",
      color: C.textPrimary,
      marginBottom: 10,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: C.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 24,
    },
    btnRow: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
    },
    cancelBtn: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: C.border,
      backgroundColor: C.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelText: { fontSize: 15, fontWeight: "700", color: C.textPrimary },
    confirmBtn: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      backgroundColor: "#EF4444",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#EF4444",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    confirmText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  });
}
