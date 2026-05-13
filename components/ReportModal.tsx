import { useAdminStore } from "@/store/admin";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ReasonKey = "abuse" | "spam" | "harassment" | "inappropriate" | "other";

const REASONS: { key: ReasonKey; label: string; icon: string }[] = [
  { key: "abuse",         label: "Abuse",                icon: "🔞" },
  { key: "spam",          label: "Spam",                 icon: "📢" },
  { key: "harassment",    label: "Harassment",           icon: "😡" },
  { key: "inappropriate", label: "Inappropriate Content",icon: "⚠️" },
  { key: "other",         label: "Other",                icon: "📝" },
];

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  type: "message" | "user" | "group";
  reportedUserId?: string;
  reportedUserName?: string;
  reportedGroupId?: string;
  reportedGroupName?: string;
  messageId?: string;
  messageText?: string;
}

export function ReportModal({
  visible,
  onClose,
  type,
  reportedUserId,
  reportedUserName,
  reportedGroupId,
  reportedGroupName,
  messageId,
  messageText,
}: ReportModalProps) {
  const { token } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);
  const { submitReport } = useAdminStore();

  const [step, setStep] = useState<"reason" | "detail">("reason");
  const [reason, setReason] = useState<ReasonKey | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep("reason");
    setReason(null);
    setDescription("");
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleReasonPick = (key: ReasonKey) => {
    setReason(key);
    setStep("detail");
  };

  const handleSubmit = async () => {
    if (!reason || !token) return;
    setSubmitting(true);
    try {
      await submitReport(token, {
        type,
        ...(reportedUserId  ? { reportedUser:  reportedUserId }  : {}),
        ...(reportedGroupId ? { reportedGroup: reportedGroupId } : {}),
        message:     messageId,
        messageText: messageText?.slice(0, 1000),
        reason,
        description: description.trim() || undefined,
      });
      reset();
      onClose();
      setTimeout(
        () => Alert.alert("Report Submitted", "Our team will review it shortly."),
        300,
      );
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {step === "reason" ? (
          <>
            <Text style={styles.title}>
              {type === "message" ? "Report Message" : type === "group" ? "Report Group" : "Report User"}
            </Text>
            {(reportedUserName || reportedGroupName) ? (
              <Text style={styles.subtitle}>
                Reporting {type === "group" ? reportedGroupName : reportedUserName}
              </Text>
            ) : null}
            <Text style={styles.prompt}>What's the issue?</Text>
            {REASONS.map((r, i, arr) => (
              <View key={r.key}>
                <TouchableOpacity style={styles.option} onPress={() => handleReasonPick(r.key)}>
                  <Text style={styles.optionIcon}>{r.icon}</Text>
                  <Text style={styles.optionText}>{r.label}</Text>
                  <Text style={styles.optionChevron}>›</Text>
                </TouchableOpacity>
                {i < arr.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => setStep("reason")} style={styles.backRow}>
              <Text style={styles.backArrow}>←</Text>
              <Text style={styles.backLabel}>{REASONS.find((r) => r.key === reason)?.label}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Add Details (optional)</Text>
            {messageText ? (
              <View style={styles.msgPreview}>
                <Text style={styles.msgPreviewText} numberOfLines={2}>"{messageText}"</Text>
              </View>
            ) : null}
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the issue…"
              placeholderTextColor={C.textSecondary}
              multiline
              maxLength={500}
            />
            {submitting ? (
              <ActivityIndicator size="small" color={C.primary} style={{ marginTop: 16 }} />
            ) : (
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitText}>Submit Report</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
    sheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20, paddingBottom: 44, paddingTop: 12,
      gap: 4,
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: C.border, alignSelf: "center", marginBottom: 8,
    },
    title:    { fontSize: 17, fontWeight: "800", color: C.textPrimary, textAlign: "center", marginBottom: 2 },
    subtitle: { fontSize: 13, color: C.textSecondary, textAlign: "center", marginBottom: 4 },
    prompt:   { fontSize: 13, color: C.textSecondary, marginBottom: 8, marginTop: 4 },

    option: {
      flexDirection: "row", alignItems: "center",
      paddingVertical: 14, gap: 12,
    },
    optionIcon:    { fontSize: 20, width: 28 },
    optionText:    { flex: 1, fontSize: 15, color: C.textPrimary, fontWeight: "500" },
    optionChevron: { fontSize: 20, color: C.textSecondary },
    divider:       { height: 1, backgroundColor: C.border },

    cancelBtn: {
      marginTop: 12, paddingVertical: 13,
      borderRadius: 14, backgroundColor: C.border,
      alignItems: "center",
    },
    cancelText: { fontSize: 15, fontWeight: "600", color: C.textPrimary },

    backRow:  { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
    backArrow:{ fontSize: 18, color: C.primary, fontWeight: "700" },
    backLabel:{ fontSize: 14, color: C.primary, fontWeight: "600" },

    msgPreview: {
      backgroundColor: C.bg, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8,
      borderWidth: 1, borderColor: C.border,
    },
    msgPreviewText: { fontSize: 13, color: C.textSecondary, fontStyle: "italic" },

    input: {
      backgroundColor: C.bg, borderRadius: 12,
      borderWidth: 1, borderColor: C.border,
      padding: 12, color: C.textPrimary, fontSize: 14,
      minHeight: 88, textAlignVertical: "top", marginBottom: 4,
    },
    submitBtn: {
      backgroundColor: C.primary, borderRadius: 14,
      paddingVertical: 14, alignItems: "center", marginTop: 8,
    },
    submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  });
}
