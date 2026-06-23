import { useAdminStore, type Report } from "@/store/admin";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TabKey = "pending" | "resolved" | "dismissed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "pending",   label: "Pending" },
  { key: "resolved",  label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
];

const REASON_LABELS: Record<Report["reason"], string> = {
  abuse:         "Abuse",
  spam:          "Spam",
  harassment:    "Harassment",
  inappropriate: "Inappropriate",
  other:         "Other",
};

const ACTION_COLORS: Record<Report["actionTaken"], string> = {
  none:    "#6B7280",
  warned:  "#F59E0B",
  blocked: "#EF4444",
};

export default function ReportsScreen() {
  const { token } = useAuthStore();
  const { isDark } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [isDark]);

  const { reports, reportsLoading, reportsPendingCount, fetchReports, resolveReport } =
    useAdminStore();

  const [tab, setTab] = useState<TabKey>("pending");
  const [resolveTarget, setResolveTarget] = useState<Report | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (token) fetchReports(token, tab);
  }, [token, tab]);

  const handleResolve = async (action: "warn" | "block" | "dismiss") => {
    if (!resolveTarget || !token) return;
    setResolving(true);
    try {
      await resolveReport(token, resolveTarget._id, action, adminNote.trim() || undefined);
      setResolveTarget(null);
      setAdminNote("");
      await fetchReports(token, tab);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not resolve report");
    } finally {
      setResolving(false);
    }
  };

  const confirmBlock = (report: Report) => {
    const target = report.reportedUser?.fullName ?? report.reportedGroup?.name ?? "this item";
    Alert.alert(
      "Block",
      report.reportedUser
        ? `Block ${target}? They will not be able to log in.`
        : `Resolve group report for "${target}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: report.reportedUser ? "Block" : "Confirm", style: "destructive", onPress: () => handleResolve("block") },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={styles.headerTitle}>Reports</Text>
          {reportsPendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{reportsPendingCount}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={reportsLoading}
            onRefresh={() => token && fetchReports(token, tab)}
            tintColor={C.primary}
          />
        }
      >
        {reportsLoading && reports.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🛡️</Text>
            <Text style={styles.emptyText}>No {tab} reports</Text>
          </View>
        ) : (
          reports.map((report) => (
            <ReportCard
              key={report._id}
              report={report}
              tab={tab}
              styles={styles}
              C={C}
              onResolve={() => { setResolveTarget(report); setAdminNote(""); }}
            />
          ))
        )}
      </ScrollView>

      {/* Resolve Modal */}
      <Modal
        visible={!!resolveTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setResolveTarget(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setResolveTarget(null)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Resolve Report</Text>

          {resolveTarget && (
            <>
              <View style={styles.sheetInfo}>
                <Text style={styles.sheetInfoLabel}>
                  {resolveTarget.type === "group" ? "Reported Group" : "Reported User"}
                </Text>
                <Text style={styles.sheetInfoValue}>
                  {resolveTarget.type === "group"
                    ? (resolveTarget.reportedGroup?.name ?? "—")
                    : (resolveTarget.reportedUser?.fullName ?? "—")}
                </Text>
              </View>
              <View style={styles.sheetInfo}>
                <Text style={styles.sheetInfoLabel}>Reason</Text>
                <Text style={styles.sheetInfoValue}>{REASON_LABELS[resolveTarget.reason]}</Text>
              </View>
              {resolveTarget.messageText ? (
                <View style={styles.sheetInfo}>
                  <Text style={styles.sheetInfoLabel}>Message</Text>
                  <Text style={[styles.sheetInfoValue, { fontStyle: "italic" }]}>"{resolveTarget.messageText}"</Text>
                </View>
              ) : null}
            </>
          )}

          <Text style={styles.noteLabel}>Admin Note (optional)</Text>
          <TextInput
            style={styles.noteInput}
            value={adminNote}
            onChangeText={setAdminNote}
            placeholder="Internal note..."
            placeholderTextColor={C.textSecondary}
            multiline
            maxLength={500}
          />

          {resolving ? (
            <ActivityIndicator size="small" color={C.primary} style={{ marginTop: 12 }} />
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#F59E0B" }]}
                onPress={() => handleResolve("warn")}
              >
                <Text style={styles.actionBtnText}>⚠️ Warn</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
                onPress={() => resolveTarget && confirmBlock(resolveTarget)}
              >
                <Text style={styles.actionBtnText}>🚫 Block</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.textSecondary }]}
                onPress={() => handleResolve("dismiss")}
              >
                <Text style={styles.actionBtnText}>✕ Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ReportCard({
  report, tab, styles, C, onResolve,
}: {
  report: Report;
  tab: TabKey;
  styles: ReturnType<typeof makeStyles>;
  C: typeof ColorPalette;
  onResolve: () => void;
}) {
  const date = new Date(report.createdAt).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>
            {report.type === "message" ? "💬 Message" : report.type === "group" ? "🏘️ Group" : "👤 User"}
          </Text>
        </View>
        <Text style={styles.cardDate}>{date}</Text>
      </View>

      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Reported</Text>
        <Text style={styles.cardValue}>
          {report.type === "group"
            ? (report.reportedGroup?.name ?? "—")
            : (report.reportedUser?.fullName ?? "—")}
        </Text>
        {report.reportedUser?.blocked && (
          <View style={[styles.statusChip, { backgroundColor: "#EF444420" }]}>
            <Text style={[styles.statusText, { color: "#EF4444" }]}>Blocked</Text>
          </View>
        )}
      </View>

      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>By</Text>
        <Text style={styles.cardValue}>{report.reportedBy.fullName}</Text>
      </View>

      <View style={styles.cardRow}>
        <Text style={styles.cardLabel}>Reason</Text>
        <View style={[styles.statusChip, { backgroundColor: C.primary + "18" }]}>
          <Text style={[styles.statusText, { color: C.primary }]}>{REASON_LABELS[report.reason]}</Text>
        </View>
      </View>

      {report.messageText ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText} numberOfLines={3}>"{report.messageText}"</Text>
        </View>
      ) : null}

      {report.description ? (
        <Text style={styles.description} numberOfLines={2}>{report.description}</Text>
      ) : null}

      {tab !== "pending" && (
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Action</Text>
          <View style={[styles.statusChip, { backgroundColor: ACTION_COLORS[report.actionTaken] + "20" }]}>
            <Text style={[styles.statusText, { color: ACTION_COLORS[report.actionTaken] }]}>
              {report.actionTaken.charAt(0).toUpperCase() + report.actionTaken.slice(1)}
            </Text>
          </View>
        </View>
      )}

      {report.adminNote ? (
        <Text style={styles.adminNote}>Note: {report.adminNote}</Text>
      ) : null}

      {tab === "pending" && (
        <TouchableOpacity style={styles.resolveBtn} onPress={onResolve}>
          <Text style={styles.resolveBtnText}>Review & Resolve</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: C.bg },
    scroll: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12, gap: 12 },
    center: { alignItems: "center", justifyContent: "center", paddingTop: 80 },

    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
      backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
    },
    backBtn:     { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    backIcon:    { fontSize: 22, color: C.primary, fontWeight: "700" },
    headerTitle: { fontSize: 18, fontWeight: "800", color: C.textPrimary },

    badge: {
      backgroundColor: "#EF4444", borderRadius: 10,
      paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: "center",
    },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    tabBar: {
      flexDirection: "row",
      backgroundColor: C.card,
      borderBottomWidth: 1, borderBottomColor: C.border,
      paddingHorizontal: 16, gap: 4,
    },
    tabBtn: {
      paddingVertical: 12, paddingHorizontal: 16,
      borderBottomWidth: 2, borderBottomColor: "transparent",
    },
    tabBtnActive:  { borderBottomColor: C.primary },
    tabLabel:      { fontSize: 14, fontWeight: "600", color: C.textSecondary },
    tabLabelActive: { color: C.primary },

    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyText:  { fontSize: 15, color: C.textSecondary, fontWeight: "500" },

    card: {
      backgroundColor: C.card, borderRadius: 16,
      borderWidth: 1, borderColor: C.border,
      padding: 14, gap: 8,
      shadowColor: "#1E1060", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    cardHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    typeBadge:   { backgroundColor: C.primary + "18", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    typeText:    { fontSize: 12, fontWeight: "600", color: C.primary },
    cardDate:    { fontSize: 11, color: C.textSecondary },
    cardRow:     { flexDirection: "row", alignItems: "center", gap: 8 },
    cardLabel:   { fontSize: 12, color: C.textSecondary, width: 60 },
    cardValue:   { fontSize: 13, fontWeight: "600", color: C.textPrimary, flex: 1 },
    statusChip:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusText:  { fontSize: 11, fontWeight: "600" },
    messageBox:  {
      backgroundColor: C.border + "60", borderRadius: 10,
      paddingHorizontal: 10, paddingVertical: 8,
    },
    messageText: { fontSize: 13, color: C.textSecondary, fontStyle: "italic" },
    description: { fontSize: 12, color: C.textSecondary },
    adminNote:   { fontSize: 12, color: C.textSecondary, fontStyle: "italic" },
    resolveBtn:  {
      backgroundColor: C.primary, borderRadius: 10,
      paddingVertical: 10, alignItems: "center", marginTop: 4,
    },
    resolveBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

    // Resolve modal
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
    sheet: {
      backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12, gap: 12,
    },
    sheetHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 4 },
    sheetTitle:     { fontSize: 17, fontWeight: "800", color: C.textPrimary, textAlign: "center" },
    sheetInfo:      { flexDirection: "row", gap: 8, alignItems: "center" },
    sheetInfoLabel: { fontSize: 12, color: C.textSecondary, width: 90 },
    sheetInfoValue: { fontSize: 13, fontWeight: "600", color: C.textPrimary, flex: 1 },
    noteLabel:      { fontSize: 12, fontWeight: "600", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
    noteInput: {
      backgroundColor: C.bg, borderRadius: 12,
      borderWidth: 1, borderColor: C.border,
      padding: 12, color: C.textPrimary, fontSize: 14,
      minHeight: 72, textAlignVertical: "top",
    },
    actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
    actionBtn: {
      flex: 1, borderRadius: 12,
      paddingVertical: 12, alignItems: "center",
    },
    actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  });
}
