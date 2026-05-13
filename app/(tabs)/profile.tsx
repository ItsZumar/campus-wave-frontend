import { ImagePreviewModal } from "@/components/ImagePreviewModal";
import { LogoutConfirmModal } from "@/components/LogoutConfirmModal";
import { useAdminStore } from "@/store/admin";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { ColorPalette, DarkColorPalette } from "@/styles";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── Root export — branches by role ───────────────────────────────────────────
export default function ProfileScreen() {
  const { user } = useAuthStore();
  if (user?.role === "admin") return <AdminProfileScreen />;
  return <StudentTeacherProfileScreen />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

function AdminProfileScreen() {
  const { user, logout, token } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeAdminStyles(C), [isDark]);
  const { stats, statsLoading, fetchStats, reportsPendingCount } = useAdminStore();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    if (token) fetchStats(token);
  }, [token]);

  const initials = buildInitials(user?.fullName ?? "A");

  const confirmLogout = async () => {
    setShowLogout(false);
    await logout();
    router.replace("/auth/login" as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
      <LogoutConfirmModal
        visible={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={confirmLogout}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() => user?.profileImage && setPreviewUri(user.profileImage)}
            disabled={!user?.profileImage}
          >
            <View style={styles.avatar}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.heroName}>{user?.fullName ?? "—"}</Text>
          <Text style={styles.heroEmail}>{user?.email ?? "—"}</Text>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>⚙️  Administrator</Text>
          </View>
        </View>

        {/* ── Platform Stats ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Platform Overview</Text>
          {statsLoading || !stats ? (
            <View style={styles.statsLoadWrap}>
              <ActivityIndicator size="small" color={C.primary} />
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <StatCard label="Total Users"  value={stats.totalUsers}    icon="👥" color="#6366F1" bg="#6366F118" />
              <StatCard label="Students"     value={stats.students}      icon="🎓" color={C.primary} bg={C.primaryLight} />
              <StatCard label="Teachers"     value={stats.teachers}      icon="📚" color="#10B981" bg="#10B98118" />
              <StatCard label="Groups"       value={stats.totalGroups}   icon="💬" color="#F59E0B" bg="#F59E0B18" />
              <StatCard label="Pending Reqs" value={stats.pendingRequests} icon="📋" color="#EF4444" bg="#EF444418" />
              <StatCard label="Messages"     value={stats.totalMessages} icon="✉️"  color="#8B5CF6" bg="#8B5CF618" />
            </View>
          )}
        </View>

        {/* ── Quick Access ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Quick Access</Text>
          <View style={styles.card}>
            <AdminNavRow
              icon="🏛️" bg="#6366F118" label="Departments"
              sub="Manage academic departments"
              onPress={() => router.push("/admin/departments" as any)}
              styles={styles}
            />
            <View style={styles.divider} />
            <AdminNavRow
              icon="📖" bg="#10B98118" label="Courses"
              sub="Create and assign courses"
              onPress={() => router.push("/admin/courses" as any)}
              styles={styles}
            />
            <View style={styles.divider} />
            <AdminNavRow
              icon="🚩" bg="#EF444418" label="Reports"
              sub="Review moderation reports"
              badge={reportsPendingCount > 0 ? reportsPendingCount : undefined}
              onPress={() => router.push("/admin/reports" as any)}
              styles={styles}
            />
            <View style={styles.divider} />
            <AdminNavRow
              icon="📢" bg="#F59E0B18" label="Announcements"
              sub="Post announcements to students"
              onPress={() => router.push("/admin/announcements" as any)}
              styles={styles}
            />
          </View>
        </View>

        {/* ── Account Settings ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <AdminNavRow
              icon="✏️" bg="#0EA5E918" label="Edit Profile"
              sub="Update name and photo"
              onPress={() => router.push("/edit-profile" as any)}
              styles={styles}
            />
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: "#8B5CF618" }]}>
                <Text style={styles.rowEmoji}>{isDark ? "🌙" : "☀️"}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Dark Mode</Text>
                <Text style={styles.rowSub}>{isDark ? "Enabled" : "Disabled"}</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggle}
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor={C.white}
              />
            </View>
          </View>
        </View>

        {/* ── Logout ── */}
        <View style={styles.section}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => setShowLogout(true)} activeOpacity={0.7}>
              <View style={[styles.iconWrap, { backgroundColor: "#EF444418" }]}>
                <Text style={styles.rowEmoji}>🚪</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: "#EF4444" }]}>Log Out</Text>
                <Text style={styles.rowSub}>Sign out of admin account</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.version}>CampusWave v1.0.0 · Admin</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Admin sub-components ──────────────────────────────────────────────────────

type AdminStyles = ReturnType<typeof makeAdminStyles>;

function StatCard({ label, value, icon, color, bg }: { label: string; value: number; icon: string; color: string; bg: string }) {
  return (
    <View style={[statCardStyle.card, { backgroundColor: bg, borderColor: color + "30" }]}>
      <Text style={statCardStyle.icon}>{icon}</Text>
      <Text style={[statCardStyle.value, { color }]}>{value.toLocaleString()}</Text>
      <Text style={statCardStyle.label}>{label}</Text>
    </View>
  );
}

const statCardStyle = StyleSheet.create({
  card: {
    flex: 1, minWidth: "45%",
    borderRadius: 16, borderWidth: 1,
    padding: 14, alignItems: "center", gap: 4,
  },
  icon:  { fontSize: 22, marginBottom: 2 },
  value: { fontSize: 22, fontWeight: "800" },
  label: { fontSize: 11, fontWeight: "600", color: "#888", textAlign: "center" },
});

function AdminNavRow({
  icon, bg, label, sub, badge, onPress, styles,
}: {
  icon: string; bg: string; label: string; sub: string;
  badge?: number; onPress: () => void; styles: AdminStyles;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        <Text style={styles.rowEmoji}>{icon}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      {badge !== undefined && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function makeAdminStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: C.bg },
    scroll: { paddingBottom: 48 },

    hero: {
      alignItems: "center",
      paddingTop: 32, paddingBottom: 28,
      backgroundColor: C.card,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    avatar: {
      width: 96, height: 96, borderRadius: 48,
      backgroundColor: "#F59E0B",
      alignItems: "center", justifyContent: "center",
      shadowColor: "#F59E0B",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
      marginBottom: 16,
    },
    avatarText:  { color: "#fff", fontSize: 34, fontWeight: "800" },
    avatarImage: { width: 96, height: 96, borderRadius: 48 },
    heroName:    { fontSize: 22, fontWeight: "800", color: C.textPrimary, marginBottom: 4 },
    heroEmail:   { fontSize: 13, color: C.textSecondary, marginBottom: 10 },
    adminBadge: {
      paddingHorizontal: 16, paddingVertical: 5,
      borderRadius: 20, backgroundColor: "#F59E0B22",
    },
    adminBadgeText: { fontSize: 13, fontWeight: "700", color: "#F59E0B" },

    section:      { paddingHorizontal: 16, paddingTop: 24 },
    sectionLabel: {
      fontSize: 12, fontWeight: "700", color: C.textSecondary,
      letterSpacing: 0.6, textTransform: "uppercase",
      marginBottom: 10, paddingHorizontal: 4,
    },

    statsLoadWrap: {
      height: 80, alignItems: "center", justifyContent: "center",
      backgroundColor: C.card, borderRadius: 18,
      borderWidth: 1, borderColor: C.border,
    },
    statsGrid: {
      flexDirection: "row", flexWrap: "wrap", gap: 10,
    },

    card: {
      backgroundColor: C.card,
      borderRadius: 18, borderWidth: 1, borderColor: C.border,
      overflow: "hidden",
      shadowColor: "#1E1060",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    },
    row: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 14, paddingVertical: 14, gap: 12,
    },
    iconWrap: {
      width: 42, height: 42, borderRadius: 12,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    rowEmoji: { fontSize: 19 },
    rowText:  { flex: 1 },
    rowLabel: { fontSize: 15, fontWeight: "600", color: C.textPrimary },
    rowSub:   { fontSize: 12, color: C.textSecondary, marginTop: 2 },
    chevron:  { fontSize: 22, color: C.placeholder },
    divider:  { height: 1, backgroundColor: C.border, marginLeft: 68 },

    badge: {
      minWidth: 22, height: 22, borderRadius: 11,
      backgroundColor: "#EF4444",
      alignItems: "center", justifyContent: "center",
      paddingHorizontal: 6,
    },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },

    version: {
      textAlign: "center", fontSize: 12,
      color: C.placeholder, marginTop: 32, fontWeight: "500",
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT / TEACHER PROFILE (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════

function StudentTeacherProfileScreen() {
  const { user, logout } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const C = isDark ? DarkColorPalette : ColorPalette;
  const styles = useMemo(() => makeStyles(C), [C]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [showLogout, setShowLogout] = useState(false);

  const initials =
    user?.fullName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "?";

  const joinedYear = user ? new Date().getFullYear().toString() : "—";
  const isTeacher  = user?.role === "teacher";

  const confirmLogout = async () => {
    setShowLogout(false);
    await logout();
    router.replace("/auth/login" as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
      <LogoutConfirmModal visible={showLogout} onCancel={() => setShowLogout(false)} onConfirm={confirmLogout} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            <TouchableOpacity
              activeOpacity={0.85}
              onLongPress={() => user?.profileImage && setPreviewUri(user.profileImage)}
              disabled={!user?.profileImage}
            >
              <View style={styles.avatar}>
                {user?.profileImage ? (
                  <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.heroName}>{user?.fullName ?? "—"}</Text>
          <Text style={styles.heroEmail}>{user?.email ?? "—"}</Text>
          {user?.role && (
            <View style={[styles.rolePill, { backgroundColor: C.primary + "22" }]}>
              <Text style={[styles.roleText, { color: C.primary }]}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {/* ── Academic Info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Academic Info</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="🏛️" label="Department" value={user?.department ?? "—"} styles={styles} />
            {!isTeacher && (
              <>
                <Divider styles={styles} />
                <InfoRow icon="📚" label="Semester" value={user?.semester ? `Semester ${user.semester}` : "—"} styles={styles} />
                <Divider styles={styles} />
                <InfoRow icon="🏷️" label="Section" value={user?.section ? `Section ${user.section}` : "—"} styles={styles} />
              </>
            )}
            <Divider styles={styles} />
            <InfoRow icon="🎓" label="Joined" value={joinedYear} styles={styles} />
          </View>
        </View>

        {/* ── Settings ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Settings</Text>
          <View style={styles.infoCard}>
            <OptionRow icon="✏️" label="Edit Profile" onPress={() => router.push("/edit-profile" as any)} showChevron styles={styles} />
            <Divider styles={styles} />
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Text style={styles.infoIcon}>{isDark ? "🌙" : "☀️"}</Text>
              </View>
              <Text style={styles.infoLabel}>Dark Mode</Text>
              <Switch
                value={isDark}
                onValueChange={toggle}
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor={C.white}
              />
            </View>
          </View>
        </View>

        {/* ── Danger zone ── */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <OptionRow icon="🚪" label="Logout" onPress={() => setShowLogout(true)} danger styles={styles} />
          </View>
        </View>

        <Text style={styles.version}>CampusWave v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
type StylesArg = { styles: ReturnType<typeof makeStyles> };

function InfoRow({ icon, label, value, styles }: { icon: string; label: string; value: string } & StylesArg) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Text style={styles.infoIcon}>{icon}</Text>
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function OptionRow({
  icon, label, value, onPress, showChevron, danger, styles,
}: {
  icon: string; label: string; value?: string;
  onPress: () => void; showChevron?: boolean; danger?: boolean;
} & StylesArg) {
  return (
    <TouchableOpacity style={styles.infoRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.infoIconWrap, danger && styles.dangerIconWrap]}>
        <Text style={styles.infoIcon}>{icon}</Text>
      </View>
      <Text style={[styles.infoLabel, danger && styles.dangerLabel]}>{label}</Text>
      {value && <Text style={styles.infoValue}>{value}</Text>}
      {showChevron && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

function Divider({ styles }: StylesArg) {
  return <View style={styles.divider} />;
}

// ─── Dynamic styles ───────────────────────────────────────────────────────────
function makeStyles(C: typeof ColorPalette) {
  return StyleSheet.create({
    safe:   { flex: 1, backgroundColor: C.bg },
    scroll: { paddingBottom: 40 },

    hero: {
      alignItems: "center",
      paddingTop: 32, paddingBottom: 28,
      backgroundColor: C.card,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    avatarWrap:  { position: "relative", marginBottom: 16 },
    avatar: {
      width: 96, height: 96, borderRadius: 48,
      backgroundColor: C.primary,
      alignItems: "center", justifyContent: "center",
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
    },
    avatarText:  { color: C.white, fontSize: 34, fontWeight: "800" },
    avatarImage: { width: 96, height: 96, borderRadius: 48 },
    heroName:    { fontSize: 22, fontWeight: "800", color: C.textPrimary, marginBottom: 4 },
    heroEmail:   { fontSize: 13, color: C.textSecondary, marginBottom: 8 },
    rolePill:    { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
    roleText:    { fontSize: 12, fontWeight: "700" },

    section:      { paddingHorizontal: 16, paddingTop: 24 },
    sectionLabel: {
      fontSize: 12, fontWeight: "700",
      color: C.textSecondary, letterSpacing: 0.6,
      textTransform: "uppercase", marginBottom: 8, paddingHorizontal: 4,
    },

    infoCard: {
      backgroundColor: C.card,
      borderRadius: 18, borderWidth: 1, borderColor: C.border,
      overflow: "hidden",
      shadowColor: "#1E1060",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    },
    infoRow: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    },
    infoIconWrap: {
      width: 34, height: 34, borderRadius: 10,
      backgroundColor: C.bg,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    dangerIconWrap: { backgroundColor: "#FEE2E2" },
    infoIcon:       { fontSize: 16 },
    infoLabel:      { flex: 1, fontSize: 14, fontWeight: "600", color: C.textPrimary },
    dangerLabel:    { color: "#EF4444" },
    infoValue:      { fontSize: 13, color: C.textSecondary, maxWidth: "45%", textAlign: "right" },
    chevron:        { fontSize: 20, color: C.placeholder, marginLeft: 2 },

    divider: { height: 1, backgroundColor: C.border, marginLeft: 62 },
    version: { textAlign: "center", fontSize: 12, color: C.placeholder, marginTop: 32 },
  });
}
