import { useAdminStore } from "@/store/admin";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminScreen() {
  const { user, token } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  const { leaveRequests, pendingCount, requestsLoading: loading, fetchLeaveRequests, approveRequest, rejectRequest } =
    useAdminStore();

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: "approve" | "reject"; id: string; userName: string; groupName: string } | null>(null);
  const [resultModal, setResultModal] = useState<{ success: boolean; type: "approve" | "reject"; message?: string } | null>(null);

  const load = (status: "pending" | "approved" | "rejected" = filter) => {
    if (!token) return;
    fetchLeaveRequests(token, status);
  };

  const onMount = () => { load(); };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaveRequests(token!, filter);
    setRefreshing(false);
  };

  const switchFilter = (f: "pending" | "approved" | "rejected") => {
    setFilter(f);
    fetchLeaveRequests(token!, f);
  };

  const handleApprove = (id: string, userName: string, groupName: string) => {
    setConfirmModal({ type: "approve", id, userName, groupName });
  };

  const handleReject = (id: string, userName: string, groupName: string) => {
    setConfirmModal({ type: "reject", id, userName, groupName });
  };

  const handleConfirm = async () => {
    if (!confirmModal) return;
    const { type, id } = confirmModal;
    setConfirmModal(null);
    setActioning(id);
    try {
      if (type === "approve") {
        await approveRequest(token!, id);
      } else {
        await rejectRequest(token!, id);
      }
      setResultModal({ success: true, type });
    } catch (err: any) {
      setResultModal({ success: false, type, message: err.message });
    } finally {
      setActioning(null);
    }
  };

  // Load on first render
  useEffect(() => { onMount(); }, []);

  if (user?.role !== "admin") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.forbidden}>
          <Text style={styles.forbiddenEmoji}>🔒</Text>
          <Text style={styles.forbiddenTitle}>Admin Only</Text>
          <Text style={styles.forbiddenSub}>You don't have permission to view this screen.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSub}>
            {pendingCount > 0 ? `${pendingCount} pending request${pendingCount > 1 ? "s" : ""}` : "No pending requests"}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>🛡️</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(["pending", "approved", "rejected"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => switchFilter(f)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && leaveRequests.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        >
          {leaveRequests.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>No {filter} requests</Text>
            </View>
          ) : (
            leaveRequests.map((req) => {
              const initials = req.user.fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              const isActioning = actioning === req._id;

              return (
                <View key={req._id} style={styles.card}>
                  {/* User row */}
                  <View style={styles.userRow}>
                    <View style={styles.avatar}>
                      {req.user.profileImage ? (
                        <Image source={{ uri: req.user.profileImage }} style={styles.avatarImg} />
                      ) : (
                        <Text style={styles.avatarText}>{initials}</Text>
                      )}
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{req.user.fullName}</Text>
                      <Text style={styles.userMeta}>
                        {req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)}
                        {req.user.department ? ` · ${req.user.department}` : ""}
                      </Text>
                    </View>
                    <StatusPill status={req.status} styles={styles} />
                  </View>

                  {/* Group info */}
                  <View style={styles.groupRow}>
                    <Text style={styles.groupLabel}>Group</Text>
                    <Text style={styles.groupName}>{req.group.name}</Text>
                  </View>
                  {req.group.semester || req.group.section ? (
                    <View style={styles.groupRow}>
                      <Text style={styles.groupLabel}>Details</Text>
                      <Text style={styles.groupName}>
                        {[
                          req.group.semester ? `Sem ${req.group.semester}` : null,
                          req.group.section  ? `Sec ${req.group.section}`  : null,
                        ].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                  ) : null}

                  {req.adminNote ? (
                    <View style={styles.noteRow}>
                      <Text style={styles.noteText}>Note: {req.adminNote}</Text>
                    </View>
                  ) : null}

                  {/* Actions — only for pending */}
                  {req.status === "pending" && (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleReject(req._id, req.user.fullName, req.group.name)}
                        disabled={isActioning}
                        activeOpacity={0.8}
                      >
                        {isActioning ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => handleApprove(req._id, req.user.fullName, req.group.name)}
                        disabled={isActioning}
                        activeOpacity={0.8}
                      >
                        {isActioning ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.approveBtnText}>Approve</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
      {/* Confirm modal */}
      <Modal visible={!!confirmModal} transparent animationType="slide" onRequestClose={() => setConfirmModal(null)}>
        <Pressable style={styles.backdrop} onPress={() => setConfirmModal(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {confirmModal?.type === "approve" ? "Approve Leave" : "Reject Leave"}
            </Text>
            <Text style={styles.sheetMsg}>
              {confirmModal?.type === "approve"
                ? `Remove ${confirmModal.userName} from "${confirmModal.groupName}"?`
                : `Reject ${confirmModal?.userName}'s leave request for "${confirmModal?.groupName}"?`}
            </Text>
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setConfirmModal(null)} activeOpacity={0.8}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetConfirmBtn, confirmModal?.type === "reject" && styles.sheetConfirmBtnReject]}
                onPress={handleConfirm}
                activeOpacity={0.85}
              >
                <Text style={styles.sheetConfirmText}>
                  {confirmModal?.type === "approve" ? "Approve" : "Reject"}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Result modal */}
      <Modal visible={!!resultModal} transparent animationType="fade" onRequestClose={() => setResultModal(null)}>
        <Pressable style={styles.backdrop} onPress={() => setResultModal(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.resultBody}>
              <View style={[styles.resultIcon, resultModal?.success ? styles.resultIconSuccess : styles.resultIconError]}>
                <Text style={{ fontSize: 28 }}>{resultModal?.success ? "✓" : "✕"}</Text>
              </View>
              <Text style={styles.resultTitle}>
                {resultModal?.success
                  ? resultModal.type === "approve" ? "Request Approved" : "Request Rejected"
                  : "Action Failed"}
              </Text>
              <Text style={styles.resultMsg}>
                {resultModal?.success
                  ? resultModal.type === "approve"
                    ? "The user has been removed from the group."
                    : "The leave request has been rejected."
                  : (resultModal?.message ?? "Something went wrong. Please try again.")}
              </Text>
            </View>
            <TouchableOpacity style={styles.resultDoneBtn} onPress={() => setResultModal(null)} activeOpacity={0.85}>
              <Text style={styles.resultDoneText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function StatusPill({ status, styles }: { status: string; styles: ReturnType<typeof makeStyles> }) {
  const config = {
    pending:  { label: "Pending",  bg: "#FEF3C7", color: "#92400E" },
    approved: { label: "Approved", bg: "#DCFCE7", color: "#166534" },
    rejected: { label: "Rejected", bg: "#FEE2E2", color: "#991B1B" },
  }[status] ?? { label: status, bg: "#F1F5F9", color: "#475569" };

  return (
    <View style={[styles.pill, { backgroundColor: config.bg }]}>
      <Text style={[styles.pillText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: C.bg },
    scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },

    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
      backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerTitle: { fontSize: 20, fontWeight: "800", color: C.textPrimary },
    headerSub:   { fontSize: 13, color: C.textSecondary, marginTop: 2 },
    headerBadge: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center",
    },
    headerBadgeText: { fontSize: 20 },

    filterRow: {
      flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10,
      backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8,
    },
    filterBtn: {
      flex: 1, height: 34, borderRadius: 10,
      alignItems: "center", justifyContent: "center",
      backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    },
    filterBtnActive:    { backgroundColor: C.primary, borderColor: C.primary },
    filterBtnText:      { fontSize: 13, fontWeight: "600", color: C.textSecondary },
    filterBtnTextActive: { color: C.white },

    empty: { alignItems: "center", paddingTop: 80, gap: 12 },
    emptyEmoji: { fontSize: 48 },
    emptyText:  { fontSize: 15, color: C.textSecondary, fontWeight: "500" },

    card: {
      backgroundColor: C.card,
      borderRadius: 18, borderWidth: 1, borderColor: C.border,
      marginBottom: 12, padding: 16,
      shadowColor: "#1E1060",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },

    userRow:  { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 },
    avatar: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: C.primary, alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    avatarImg:  { width: 44, height: 44, borderRadius: 22 },
    avatarText: { fontSize: 16, fontWeight: "800", color: C.white },
    userInfo:   { flex: 1 },
    userName:   { fontSize: 15, fontWeight: "700", color: C.textPrimary },
    userMeta:   { fontSize: 12, color: C.textSecondary, marginTop: 2 },

    pill:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    pillText: { fontSize: 11, fontWeight: "700" },

    groupRow:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
    groupLabel: { fontSize: 12, fontWeight: "700", color: C.textSecondary, width: 48 },
    groupName:  { flex: 1, fontSize: 13, color: C.textPrimary, fontWeight: "500" },

    noteRow:  { marginTop: 8, backgroundColor: "#FEF3C7", borderRadius: 8, padding: 10 },
    noteText: { fontSize: 12, color: "#92400E" },

    actions:    { flexDirection: "row", gap: 10, marginTop: 14 },
    actionBtn:  { flex: 1, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    rejectBtn:  { backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#FECACA" },
    approveBtn: { backgroundColor: C.primary },
    rejectBtnText:  { fontSize: 14, fontWeight: "700", color: "#EF4444" },
    approveBtnText: { fontSize: 14, fontWeight: "700", color: C.white },

    forbidden: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 40 },
    forbiddenEmoji: { fontSize: 56 },
    forbiddenTitle: { fontSize: 20, fontWeight: "800", color: C.textPrimary },
    forbiddenSub:   { fontSize: 14, color: C.textSecondary, textAlign: "center" },

    backdrop: { flex: 1, backgroundColor: "rgba(10,8,30,0.45)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: C.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    sheetHandle: {
      width: 36, height: 4, backgroundColor: C.border, borderRadius: 2,
      alignSelf: "center", marginTop: 12, marginBottom: 16,
    },
    sheetTitle: { fontSize: 18, fontWeight: "800", color: C.textPrimary, marginBottom: 8 },
    sheetMsg:   { fontSize: 14, color: C.textSecondary, lineHeight: 20, marginBottom: 24 },
    sheetActions: { flexDirection: "row", gap: 10 },
    sheetCancelBtn: {
      flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
      backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
    },
    sheetCancelText: { fontSize: 15, fontWeight: "700", color: C.textSecondary },
    sheetConfirmBtn: {
      flex: 1, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
      backgroundColor: C.primary,
    },
    sheetConfirmBtnReject: { backgroundColor: "#EF4444" },
    sheetConfirmText: { fontSize: 15, fontWeight: "700", color: "#fff" },

    resultBody: { alignItems: "center", paddingVertical: 16, gap: 10 },
    resultIcon: {
      width: 64, height: 64, borderRadius: 32,
      alignItems: "center", justifyContent: "center",
    },
    resultIconSuccess: { backgroundColor: "#DCFCE7" },
    resultIconError:   { backgroundColor: "#FEE2E2" },
    resultTitle: { fontSize: 20, fontWeight: "800", color: C.textPrimary },
    resultMsg:   { fontSize: 14, color: C.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 8 },
    resultDoneBtn: {
      height: 50, borderRadius: 14, backgroundColor: C.primary,
      alignItems: "center", justifyContent: "center",
    },
    resultDoneText: { fontSize: 15, fontWeight: "700", color: C.white },
  });
}
